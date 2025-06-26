// Updated script.js with persistent notification loop
const todoList = JSON.parse(localStorage.getItem("todoList")) || [];
let currentEditIndex = null;

// Unlock audio on first interaction without actually playing it
document.addEventListener("click", () => {
  const audio = document.getElementById("reminderSound");
  audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
  }).catch(() => {});
}, { once: true });

function addInput() {
  const inputEl = document.querySelector(".js-array");
  const timeEl = document.querySelector(".time-todo");
  const dateEl = document.querySelector(".todo-date");
  const priority = document.querySelector(".todo-priority").value;

  const name = inputEl.value.trim();
  const time = timeEl.value;
  const date = dateEl.value;

  if (!name || !time || !date) return alert("Please fill out all fields.");

  todoList.push({ name, time, date, priority, alerted: false, completed: false });
  try {
    localStorage.setItem("todoList", JSON.stringify(todoList));
  } catch (e) {
    alert("🚫 Storage full! Please clear some old tasks.");
  }

  inputEl.value = "";
  timeEl.value = "";
  dateEl.value = "";

  renderHTML();
}

function renderHTML() {
  const container = document.querySelector(".todoAdded");
  container.innerHTML = "";
  todoList.forEach((task, index) => {
    const badgeClass = task.priority === 'High' ? 'bg-danger' : task.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-success';
    const timeLeft = getTimeLeft(task.date, task.time);
    container.innerHTML += `
      <div class="card mb-3">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <h5 class="card-title mb-1 ${task.completed ? 'completed' : ''}">${task.name}</h5>
            <span class="badge ${badgeClass}">${task.priority}</span><br>
            <small class="task-meta">⏰ ${task.time} | 📅 ${task.date}</small><br>
            <span class="countdown">⏳ ${timeLeft}</span>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-success" onclick="toggleComplete(${index})">✔️</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="editTask(${index})">✏️</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteTodo(${index})">🗑</button>
          </div>
        </div>
      </div>`;
  });
}

function getTimeLeft(date, time) {
  const now = new Date();
  const target = new Date(`${date}T${time}`);
  const diff = target - now;
  if (diff < 0) return "Due";
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const hours = Math.floor((diff / 1000 / 60 / 60));
  return `${hours}h ${minutes}m left`;
}

function toggleComplete(index) {
  todoList[index].completed = !todoList[index].completed;
  try {
    localStorage.setItem("todoList", JSON.stringify(todoList));
  } catch (e) {
    alert("🚫 Unable to save completion status. Storage might be full.");
  }
  renderHTML();
}

function deleteTodo(index) {
  todoList.splice(index, 1);
  try {
    localStorage.setItem("todoList", JSON.stringify(todoList));
  } catch (e) {
    alert("⚠️ Failed to delete task due to full storage.");
  }
  renderHTML();
}

function editTask(index) {
  const task = todoList[index];
  document.getElementById("editTaskName").value = task.name;
  document.getElementById("editTaskTime").value = task.time;
  document.getElementById("editTaskDate").value = task.date;
  document.getElementById("editTaskPriority").value = task.priority;
  currentEditIndex = index;
  new bootstrap.Modal(document.getElementById("editModal")).show();
}

function saveEdit() {
  if (currentEditIndex === null) return;
  const task = todoList[currentEditIndex];
  task.name = document.getElementById("editTaskName").value;
  task.time = document.getElementById("editTaskTime").value;
  task.date = document.getElementById("editTaskDate").value;
  task.priority = document.getElementById("editTaskPriority").value;
  try {
    localStorage.setItem("todoList", JSON.stringify(todoList));
  } catch (e) {
    alert("⚠️ Couldn't save changes. You may be out of storage space.");
  }
  renderHTML();
  bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
}

// Persistent notification checker
setInterval(() => {
  const now = new Date();
  todoList.forEach((task, i) => {
    if (!task.alerted && task.time && task.date) {
      const taskTime = new Date(`${task.date}T${task.time}`);
      if (!task.alerted && taskTime <= now && (now - taskTime) <= 60000) {
        if (Notification.permission === "granted") {
          new Notification(`Reminder: ${task.name}`, {
            body: "Your task is due now!",
            icon: "icon-192.png"
          });
        } else {
          alert(`🔔 Reminder: ${task.name}`);
        }
        document.getElementById("webToastText").innerText = `⏰ Reminder: ${task.name}`;
        new bootstrap.Toast(document.getElementById("webToast")).show();
        document.getElementById("reminderSound").play().catch(() => {});
        task.alerted = true;
      }
    }
  });
  try {
    localStorage.setItem("todoList", JSON.stringify(todoList));
  } catch (e) {
    console.warn("⚠️ Reminder status could not be saved. Storage may be full.");
  }
  renderHTML();
}, 10000);

const darkToggle = document.getElementById("toggleDarkModeSwitch");
const icon = document.querySelector(".slider .icon");

darkToggle.addEventListener("change", function () {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  icon.textContent = this.checked ? "☀️" : "🌙";
});

const pushToggle = document.getElementById("togglePushSwitch");

pushToggle.addEventListener("change", function () {
  if (this.checked) {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("🔔 Push Enabled", {
          body: "You’ll now receive task reminders!",
          icon: "icon-192.png"
        });
        localStorage.setItem("pushEnabled", "true");
      } else {
        this.checked = false;
        localStorage.setItem("pushEnabled", "false");
        alert("Notification permission denied.");
      }
    });
  } else {
    localStorage.setItem("pushEnabled", "false");
  }
});

window.onload = () => {
  renderHTML();
  const savedTheme = localStorage.getItem("darkMode") === "true";
  if (savedTheme) {
    document.body.classList.add("dark-mode");
    darkToggle.checked = true;
    icon.textContent = "☀️";
  } else {
    icon.textContent = "🌙";
  }
  const pushPref = localStorage.getItem("pushEnabled") === "true";
  document.getElementById("togglePushSwitch").checked = pushPref;
};

if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
