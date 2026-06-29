/**
 * VICE TASKS - Calendar Checklist Engine
 * Built with vanilla JS for responsive local-first action.
 */

// Central state
const state = {
  currentDate: new Date(), // Selected date
  viewDate: new Date(),    // Calendar view month/year
  tasks: {}                // Format: { "YYYY-MM-DD": [ { id, text, completed, priority } ] }
};

// LocalStorage Database Key
const STORAGE_KEY = 'vice-tasks-db';

let draggedIndex = null;

// DOM Element references
const calendarDaysGrid = document.getElementById('calendar-days-grid');
const currentMonthYearLabel = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');

const selectedDayTitle = document.getElementById('selected-day-title');
const missionListContainer = document.getElementById('mission-list-container');
const addMissionForm = document.getElementById('add-mission-form');
const newMissionInput = document.getElementById('new-mission-input');
const newMissionPriority = document.getElementById('new-mission-priority');

const completedCountLabel = document.getElementById('completed-count');
const totalCountLabel = document.getElementById('total-count');
const progressPercentageVal = document.getElementById('progress-percentage-val');
const progressRingCircle = document.querySelector('.progress-ring__circle');
const dashboardStatusBanner = document.getElementById('dashboard-status-banner');

const gtaOverlayMessage = document.getElementById('gta-overlay-message');
const gtaMsgTitle = document.getElementById('gta-msg-title');
const gtaMsgSubtitle = document.getElementById('gta-msg-subtitle');

// Progress ring calculations
const radius = 24;
const circumference = 2 * Math.PI * radius; // Approx 150.796

/* ==========================================
   INITIALIZATION & DATA SYNC
   ========================================== */

function init() {
  // Setup progress ring
  progressRingCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressRingCircle.style.strokeDashoffset = circumference;
  
  // Load tasks from storage
  loadFromStorage();
  
  // Set current selected date to today
  state.currentDate = new Date();
  state.viewDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth(), 1);
  
  // Set dynamic establishment and footer year
  const currentYear = new Date().getFullYear();
  const estYearEl = document.getElementById('app-est-year');
  if (estYearEl) estYearEl.textContent = currentYear;
  const footerYearEl = document.getElementById('app-footer-year');
  if (footerYearEl) footerYearEl.textContent = currentYear;
  
  // Attach event listeners
  prevMonthBtn.addEventListener('click', navigatePreviousMonth);
  nextMonthBtn.addEventListener('click', navigateNextMonth);
  addMissionForm.addEventListener('submit', handleAddMission);
  
  // Initial render
  renderApp();
}

function loadFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      state.tasks = JSON.parse(data);
    } catch (e) {
      console.error("Failed to load tasks database from storage", e);
      state.tasks = {};
    }
  } else {
    // Populate some cool placeholder tasks for today so the user starts with style
    const todayStr = getLocalDateString(new Date());
    state.tasks[todayStr] = [
      { id: 'init-1', text: 'Scout Vice City coastline for cargo drop', completed: true, priority: 'high' },
      { id: 'init-2', text: 'Meet Lucia at the neon diner on Ocean Drive', completed: false, priority: 'normal' },
      { id: 'init-3', text: 'Customize sports car at the custom shop', completed: false, priority: 'normal' }
    ];
    saveToStorage();
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

// Convert native Date object to local YYYY-MM-DD string
function getLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper to format date header (e.g. "MONDAY, JUNE 29, 2026")
function formatDateHeaderString(date) {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  
  const dayName = days[date.getDay()];
  const monthName = months[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();
  
  return `${dayName}, ${monthName} ${dayNum}, ${year}`;
}

/* ==========================================
   RENDER FUNCTIONS
   ========================================== */

function renderApp() {
  renderCalendar();
  renderChecklist();
  updateProgressStats();
}

/**
 * Render the Vice Calendar Grid
 */
function renderCalendar() {
  const year = state.viewDate.getFullYear();
  const month = state.viewDate.getMonth();
  
  // Set month label
  const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  currentMonthYearLabel.textContent = `${monthNames[month]} ${year}`;
  
  // Clear days grid
  calendarDaysGrid.innerHTML = '';
  
  // Calculate day cells
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday...
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const todayStr = getLocalDateString(new Date());
  const selectedStr = getLocalDateString(state.currentDate);
  
  // Render previous month cells (padding)
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayVal = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, dayVal);
    createDayCell(prevMonthDate, dayVal, true);
  }
  
  // Render current month cells
  for (let d = 1; d <= daysInMonth; d++) {
    const currentDate = new Date(year, month, d);
    createDayCell(currentDate, d, false);
  }
  
  // Render next month cells (padding to fill grid to multiple of 7)
  const totalRendered = startDayOfWeek + daysInMonth;
  const remainingCells = (7 - (totalRendered % 7)) % 7;
  // If calendar grid ends exactly on a row edge, we can leave it, or pad up to 42 cells.
  // Standard grid size of 35 or 42 is neat. Let's make it hit 42 to avoid height jumps.
  const targetTotal = totalRendered + remainingCells <= 35 ? 35 : 42;
  const cellsNeeded = targetTotal - totalRendered;
  
  for (let d = 1; d <= cellsNeeded; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    createDayCell(nextMonthDate, d, true);
  }
}

/**
 * Creates and appends a single day element inside the calendar grid
 */
function createDayCell(date, dayNum, isOtherMonth) {
  const dateStr = getLocalDateString(date);
  const dayTasks = state.tasks[dateStr] || [];
  
  const dayCell = document.createElement('div');
  dayCell.classList.add('calendar-day');
  if (isOtherMonth) dayCell.classList.add('other-month');
  
  // Check if today
  const todayStr = getLocalDateString(new Date());
  if (dateStr === todayStr) {
    dayCell.classList.add('today');
  }
  
  // Check if selected
  const selectedStr = getLocalDateString(state.currentDate);
  if (dateStr === selectedStr) {
    dayCell.classList.add('selected-day');
  }
  
  // Check if all completed
  if (dayTasks.length > 0) {
    const allCompleted = dayTasks.every(t => t.completed);
    if (allCompleted) {
      dayCell.classList.add('all-completed');
    }
  }
  
  // Render structure
  const numSpan = document.createElement('span');
  numSpan.classList.add('day-number');
  numSpan.textContent = dayNum;
  dayCell.appendChild(numSpan);
  
  // Render task indicators (dots)
  const indicatorsDiv = document.createElement('div');
  indicatorsDiv.classList.add('day-indicators');
  
  // Limit indicators to max 3 dots to prevent overflow layout breakages
  const displayTasksCount = Math.min(dayTasks.length, 3);
  for (let i = 0; i < displayTasksCount; i++) {
    const dot = document.createElement('span');
    dot.classList.add('dot-indicator');
    if (dayTasks[i].completed) {
      dot.classList.add('completed');
    }
    indicatorsDiv.appendChild(dot);
  }
  dayCell.appendChild(indicatorsDiv);
  
  // Click event: Select date
  dayCell.addEventListener('click', () => {
    state.currentDate = date;
    
    // If user clicks a day in an adjacent month, shift the main view
    if (isOtherMonth) {
      state.viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }
    
    renderApp();
  });
  
  calendarDaysGrid.appendChild(dayCell);
}

/**
 * Render the daily mission checklist pane (Right Panel)
 */
function renderChecklist() {
  const selectedStr = getLocalDateString(state.currentDate);
  selectedDayTitle.textContent = formatDateHeaderString(state.currentDate);
  
  const dayTasks = state.tasks[selectedStr] || [];
  missionListContainer.innerHTML = '';
  
  if (dayTasks.length === 0) {
    missionListContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌴</div>
        <p class="empty-title">NO ACTIVE CONTRACTS</p>
        <p class="empty-desc">Establish a new contract for this day below.</p>
      </div>
    `;
    return;
  }
  
  dayTasks.forEach((task, index) => {
    const taskItem = document.createElement('div');
    taskItem.classList.add('mission-item');
    if (task.completed) taskItem.classList.add('completed');
    if (task.priority === 'high') taskItem.classList.add('priority-high');
    
    // Drag and Drop support
    taskItem.setAttribute('draggable', 'true');
    taskItem.setAttribute('data-index', index);
    
    taskItem.addEventListener('dragstart', (e) => {
      draggedIndex = index;
      setTimeout(() => {
        taskItem.classList.add('dragging');
      }, 0);
    });
    
    taskItem.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    taskItem.addEventListener('dragenter', (e) => {
      e.preventDefault();
      const parentItem = e.target.closest('.mission-item');
      if (parentItem) {
        parentItem.classList.add('drag-over');
      }
    });
    
    taskItem.addEventListener('dragleave', (e) => {
      const parentItem = e.target.closest('.mission-item');
      if (parentItem) {
        parentItem.classList.remove('drag-over');
      }
    });
    
    taskItem.addEventListener('drop', (e) => {
      e.preventDefault();
      const parentItem = e.target.closest('.mission-item');
      if (!parentItem) return;
      parentItem.classList.remove('drag-over');
      
      const targetIndex = parseInt(parentItem.getAttribute('data-index'), 10);
      if (draggedIndex === null || draggedIndex === targetIndex) return;
      
      const selectedStr = getLocalDateString(state.currentDate);
      const dayTasks = state.tasks[selectedStr] || [];
      const [draggedTask] = dayTasks.splice(draggedIndex, 1);
      dayTasks.splice(targetIndex, 0, draggedTask);
      
      saveToStorage();
      renderApp();
    });
    
    taskItem.addEventListener('dragend', () => {
      taskItem.classList.remove('dragging');
      draggedIndex = null;
    });
    
    // Checkbox container
    const checkboxLabel = document.createElement('label');
    checkboxLabel.classList.add('mission-checkbox-container');
    
    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.checked = task.completed;
    checkboxInput.addEventListener('change', () => toggleTaskCompletion(index));
    
    const checkmarkSpan = document.createElement('span');
    checkmarkSpan.classList.add('checkmark');
    // SVG tick
    checkmarkSpan.innerHTML = `
      <svg viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    
    checkboxLabel.appendChild(checkboxInput);
    checkboxLabel.appendChild(checkmarkSpan);
    
    // Content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('mission-content-wrapper');
    
    // Text container
    const textContainer = document.createElement('div');
    textContainer.classList.add('mission-text-container');
    
    const textSpan = document.createElement('span');
    textSpan.classList.add('mission-text');
    textSpan.textContent = task.text;
    
    // Double click to edit text
    textSpan.addEventListener('dblclick', () => startEditingTask(index, textSpan, contentWrapper));
    
    textContainer.appendChild(textSpan);
    contentWrapper.appendChild(textContainer);
    
    // Meta / Tags
    const metaInfo = document.createElement('div');
    metaInfo.classList.add('mission-meta-info');
    
    const tag = document.createElement('span');
    tag.classList.add('priority-tag');
    tag.textContent = task.priority === 'high' ? 'WANTED LEVEL ★★★★★' : 'STREET CONTACT';
    metaInfo.appendChild(tag);
    
    contentWrapper.appendChild(metaInfo);
    
    // Edit Action Trigger Button
    const actionsTrigger = document.createElement('div');
    actionsTrigger.classList.add('mission-actions-trigger');
    
    const editBtn = document.createElement('button');
    editBtn.classList.add('edit-btn');
    editBtn.setAttribute('aria-label', 'Edit contract');
    editBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
      </svg>
    `;
    editBtn.addEventListener('click', () => startEditingTask(index, textSpan, contentWrapper));
    
    actionsTrigger.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-btn');
    deleteBtn.setAttribute('aria-label', 'Cancel contract');
    deleteBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
    `;
    deleteBtn.addEventListener('click', () => deleteTask(index));
    
    actionsTrigger.appendChild(deleteBtn);
    
    // Assemble card
    taskItem.appendChild(checkboxLabel);
    taskItem.appendChild(contentWrapper);
    taskItem.appendChild(actionsTrigger);
    
    missionListContainer.appendChild(taskItem);
  });
}

/**
 * Handle Inline Editing of a Task
 */
function startEditingTask(index, textElement, containerElement) {
  const selectedStr = getLocalDateString(state.currentDate);
  const dayTasks = state.tasks[selectedStr] || [];
  const currentTask = dayTasks[index];
  if (!currentTask) return;
  
  // Store the original content to swap back if cancelled
  const originalHTML = containerElement.innerHTML;
  
  // Clear the container elements to show input field
  containerElement.innerHTML = '';
  
  const editForm = document.createElement('form');
  editForm.classList.add('edit-mission-form');
  
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.value = currentTask.text;
  editInput.classList.add('edit-input');
  editInput.required = true;
  editInput.autocomplete = 'off';
  
  const actionsDiv = document.createElement('div');
  actionsDiv.classList.add('edit-actions');
  
  // Save Button
  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.classList.add('edit-save-btn');
  saveBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  
  // Cancel Button
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.classList.add('edit-cancel-btn');
  cancelBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  
  actionsDiv.appendChild(saveBtn);
  actionsDiv.appendChild(cancelBtn);
  
  editForm.appendChild(editInput);
  editForm.appendChild(actionsDiv);
  containerElement.appendChild(editForm);
  
  // Focus the input text
  editInput.focus();
  editInput.select();
  
  // Form submission: save edits
  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const updatedText = editInput.value.trim();
    if (updatedText) {
      currentTask.text = updatedText;
      saveToStorage();
      renderChecklist();
    }
  });
  
  // Cancel actions
  cancelBtn.addEventListener('click', () => {
    renderChecklist(); // Just redraw the checklist to restore original state
  });
  
  // Escape key to cancel
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      renderChecklist();
    }
  });
}

/**
 * Update global progress tracking ring, stats counter, and GTA banners
 */
function updateProgressStats() {
  const selectedStr = getLocalDateString(state.currentDate);
  const dayTasks = state.tasks[selectedStr] || [];
  
  const total = dayTasks.length;
  const completed = dayTasks.filter(t => t.completed).length;
  
  // Update task list counter badge
  completedCountLabel.textContent = completed;
  totalCountLabel.textContent = total;
  
  // Calculate percentage
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  progressPercentageVal.textContent = `${percentage}%`;
  
  // Set stroke-dashoffset on the progress SVG circle
  const offset = total === 0 ? circumference : circumference - (percentage / 100) * circumference;
  progressRingCircle.style.strokeDashoffset = offset;
  
  // Update status banner text
  if (total === 0) {
    dashboardStatusBanner.textContent = 'NO ACTIVE CONTRACTS';
    dashboardStatusBanner.style.color = 'var(--text-secondary)';
    dashboardStatusBanner.style.textShadow = 'none';
  } else if (completed === total) {
    dashboardStatusBanner.textContent = 'MISSION PASSED';
    dashboardStatusBanner.style.color = 'var(--neon-cyan)';
    dashboardStatusBanner.style.textShadow = '0 0 10px var(--neon-cyan-glow)';
  } else {
    // Check if the selected date is in the past relative to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(state.currentDate);
    selected.setHours(0, 0, 0, 0);
    const isPastDay = selected < today;

    if (isPastDay) {
      dashboardStatusBanner.textContent = 'MISSION FAILED';
      dashboardStatusBanner.style.color = 'var(--neon-red)';
      dashboardStatusBanner.style.textShadow = '0 0 10px var(--neon-red-glow)';
    } else {
      dashboardStatusBanner.textContent = 'MISSION IN PROGRESS';
      dashboardStatusBanner.style.color = 'var(--neon-pink)';
      dashboardStatusBanner.style.textShadow = '0 0 10px var(--neon-pink-glow)';
    }
  }
}

/* ==========================================
   INTERACTIVE HANDLERS
   ========================================== */

function handleAddMission(e) {
  e.preventDefault();
  
  const text = newMissionInput.value.trim();
  const priority = newMissionPriority.value;
  if (!text) return;
  
  const selectedStr = getLocalDateString(state.currentDate);
  if (!state.tasks[selectedStr]) {
    state.tasks[selectedStr] = [];
  }
  
  const newTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: text,
    completed: false,
    priority: priority
  };
  
  state.tasks[selectedStr].push(newTask);
  saveToStorage();
  
  // Reset input field
  newMissionInput.value = '';
  newMissionPriority.value = 'normal';
  
  // Re-render everything
  renderApp();
}

function toggleTaskCompletion(index) {
  const selectedStr = getLocalDateString(state.currentDate);
  const dayTasks = state.tasks[selectedStr] || [];
  if (!dayTasks[index]) return;
  
  const wasCompleted = dayTasks[index].completed;
  dayTasks[index].completed = !wasCompleted;
  
  saveToStorage();
  
  // Trigger GTA Pass display if it was incomplete and now completed all tasks for the day
  const isNowCompleted = dayTasks[index].completed;
  const allCompletedNow = dayTasks.every(t => t.completed);
  
  if (isNowCompleted && allCompletedNow) {
    triggerGtaOverlayMessage("MISSION PASSED", "RESPECT +");
  }
  
  renderApp();
}

function navigatePreviousMonth() {
  state.viewDate.setMonth(state.viewDate.getMonth() - 1);
  renderCalendar();
}

function navigateNextMonth() {
  state.viewDate.setMonth(state.viewDate.getMonth() + 1);
  renderCalendar();
}

/**
 * High-impact Grand Theft Auto style fullscreen popup overlay
 */
function triggerGtaOverlayMessage(title, subtitle) {
  gtaMsgTitle.textContent = title;
  gtaMsgSubtitle.textContent = subtitle;
  
  gtaOverlayMessage.classList.add('show');
  
  // Play subtle visual audio cues by vibrating, or fade out in 3.5 seconds
  setTimeout(() => {
    gtaOverlayMessage.classList.remove('show');
  }, 3500);
}

function deleteTask(index) {
  const selectedStr = getLocalDateString(state.currentDate);
  const dayTasks = state.tasks[selectedStr] || [];
  if (!dayTasks[index]) return;
  
  dayTasks.splice(index, 1);
  saveToStorage();
  renderApp();
}

// Kickstart application on load
window.addEventListener('DOMContentLoaded', init);
