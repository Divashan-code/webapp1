class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentEditId = null;
        this.currentDeleteId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderTasks();
        this.updateStats();
    }

    bindEvents() {
        // Modal controls
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('taskForm').addEventListener('submit', (e) => this.saveTask(e));

        // Confirmation modal
        document.getElementById('cancelDelete').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirmDelete').addEventListener('click', () => this.deleteTask());

        // Search and filter
        document.getElementById('searchInput').addEventListener('input', () => this.renderTasks());
        document.getElementById('filterSelect').addEventListener('change', () => this.renderTasks());

        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
                this.closeConfirmModal();
            }
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    loadTasks() {
        const tasks = localStorage.getItem('tasks');
        return tasks ? JSON.parse(tasks) : [];
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        this.updateStats();
    }

    openModal(taskId = null) {
        this.currentEditId = taskId;
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('modalTitle');

        if (taskId) {
            title.textContent = 'Edit Task';
            this.fillForm(taskId);
        } else {
            title.textContent = 'Add New Task';
            this.resetForm();
        }

        modal.classList.add('show');
        document.getElementById('taskTitle').focus();
    }

    closeModal() {
        document.getElementById('taskModal').classList.remove('show');
        this.currentEditId = null;
    }

    openConfirmModal(taskId) {
        this.currentDeleteId = taskId;
        document.getElementById('confirmModal').classList.add('show');
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('show');
        this.currentDeleteId = null;
    }

    resetForm() {
        document.getElementById('taskForm').reset();
        document.getElementById('taskDueDate').valueAsDate = new Date();
        document.getElementById('taskPriority').value = 'medium';
        document.getElementById('taskStatus').value = 'todo';
    }

    fillForm(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskDueDate').value = task.dueDate || '';
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskStatus').value = task.status;
    }

    saveTask(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const taskData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            dueDate: document.getElementById('taskDueDate').value,
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            createdAt: new Date().toISOString()
        };

        if (!taskData.title) {
            alert('Task title is required!');
            return;
        }

        if (this.currentEditId) {
            // Update existing task
            const index = this.tasks.findIndex(t => t.id === this.currentEditId);
            if (index !== -1) {
                this.tasks[index] = { ...this.tasks[index], ...taskData };
            }
        } else {
            // Add new task
            taskData.id = this.generateId();
            this.tasks.push(taskData);
        }

        this.saveTasks();
        this.renderTasks();
        this.closeModal();

        // Show success animation
        this.showSuccessAnimation();
    }

    deleteTask() {
        if (!this.currentDeleteId) return;

        this.tasks = this.tasks.filter(task => task.id !== this.currentDeleteId);
        this.saveTasks();
        this.renderTasks();
        this.closeConfirmModal();
    }

    editTask(taskId) {
        this.openModal(taskId);
    }

    confirmDelete(taskId) {
        this.openConfirmModal(taskId);
    }

    updateTaskStatus(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            this.saveTasks();
            this.renderTasks();
        }
    }

    getFilteredTasks() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filterValue = document.getElementById('filterSelect').value;

        return this.tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm) ||
                                task.description.toLowerCase().includes(searchTerm);
            
            let matchesFilter = true;
            if (filterValue === 'todo') matchesFilter = task.status === 'todo';
            else if (filterValue === 'inProgress') matchesFilter = task.status === 'inProgress';
            else if (filterValue === 'completed') matchesFilter = task.status === 'completed';
            else if (filterValue === 'high') matchesFilter = task.priority === 'high';
            else if (filterValue === 'medium') matchesFilter = task.priority === 'medium';
            else if (filterValue === 'low') matchesFilter = task.priority === 'low';

            return matchesSearch && matchesFilter;
        });
    }

    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        
        // Clear all task lists
        document.getElementById('todoTasks').innerHTML = '';
        document.getElementById('inProgressTasks').innerHTML = '';
        document.getElementById('completedTasksList').innerHTML = '';

        // Count tasks by status
        const todoCount = filteredTasks.filter(task => task.status === 'todo').length;
        const inProgressCount = filteredTasks.filter(task => task.status === 'inProgress').length;
        const completedCount = filteredTasks.filter(task => task.status === 'completed').length;

        document.getElementById('todoCount').textContent = todoCount;
        document.getElementById('inProgressCount').textContent = inProgressCount;
        document.getElementById('completedCount').textContent = completedCount;

        // Render tasks
        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            const container = document.getElementById(`${task.status}Tasks`) || 
                            document.getElementById('completedTasksList');
            container.appendChild(taskElement);
        });

        // Add empty states
        this.addEmptyStates();
    }

    createTaskElement(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-card ${task.priority}-priority ${task.status === 'completed' ? 'completed' : ''}`;
        taskDiv.draggable = true;
        taskDiv.dataset.taskId = task.id;

        // Check if task is overdue
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
        
        taskDiv.innerHTML = `
            <div class="task-header">
                <div>
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                </div>
            </div>
            <div class="task-meta">
                ${task.dueDate ? `
                    <div class="task-due-date ${isOverdue ? 'overdue' : ''}">
                        <i class="far fa-calendar"></i>
                        ${new Date(task.dueDate).toLocaleDateString()}
                    </div>
                ` : ''}
                <div class="task-priority priority-${task.priority}">
                    ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </div>
            </div>
            <div class="task-actions">
                ${task.status !== 'completed' ? 
                    `<button class="btn btn-success" onclick="taskManager.updateTaskStatus('${task.id}', 'completed')">
                        <i class="fas fa-check"></i> Complete
                    </button>` : 
                    `<button class="btn btn-secondary" onclick="taskManager.updateTaskStatus('${task.id}', 'todo')">
                        <i class="fas fa-undo"></i> Reopen
                    </button>`
                }
                <button class="btn" onclick="taskManager.editTask('${task.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger" onclick="taskManager.confirmDelete('${task.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        // Add drag and drop
        this.addDragAndDrop(taskDiv);

        return taskDiv;
    }

    addDragAndDrop(element) {
        element.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', element.dataset.taskId);
            element.classList.add('dragging');
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
        });

        // Add drop zones to columns
        const columns = document.querySelectorAll('.column');
        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            });

            column.addEventListener('dragleave', () => {
                column.style.backgroundColor = '';
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.style.backgroundColor = '';
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = column.dataset.status;
                this.updateTaskStatus(taskId, newStatus);
            });
        });
    }

    addEmptyStates() {
        const columns = {
            todoTasks: 'No tasks to do',
            inProgressTasks: 'No tasks in progress',
            completedTasksList: 'No completed tasks'
        };

        Object.entries(columns).forEach(([id, message]) => {
            const container = document.getElementById(id);
            if (container.children.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clipboard-list"></i>
                        <p>${message}</p>
                    </div>
                `;
            }
        });
    }

    updateStats() {
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(task => task.status === 'completed').length;

        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
    }

    showSuccessAnimation() {
        const btn = document.getElementById('addTaskBtn');
        btn.classList.add('btn-success');
        btn.innerHTML = '<i class="fas fa-check"></i> Task Saved!';
        
        setTimeout(() => {
            btn.classList.remove('btn-success');
            btn.innerHTML = '<i class="fas fa-plus"></i> Add New Task';
        }, 2000);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the application
const taskManager = new TaskManager();

// Add some sample data if no tasks exist
if (taskManager.tasks.length === 0) {
    const sampleTasks = [
        {
            id: '1',
            title: 'Welcome to TaskFlow!',
            description: 'This is your first task. You can edit, delete, or mark it as completed.',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'high',
            status: 'todo',
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            title: 'Create a new task',
            description: 'Try adding your own tasks using the "Add New Task" button.',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            priority: 'medium',
            status: 'inProgress',
            createdAt: new Date().toISOString()
        },
        {
            id: '3',
            title: 'Explore features',
            description: 'Drag and drop tasks between columns, search, and filter your tasks.',
            dueDate: new Date().toISOString().split('T')[0],
            priority: 'low',
            status: 'completed',
            createdAt: new Date().toISOString()
        }
    ];

    taskManager.tasks = sampleTasks;
    taskManager.saveTasks();
    taskManager.renderTasks();
}
