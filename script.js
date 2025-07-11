// ✅ Save and load todo list
const todoList = JSON.parse(localStorage.getItem("todoList")) || [];
let currentEditIndex = null;

// 🔊 Unlock audio
if (typeof window !== 'undefined') {
  document.addEventListener("click", () => {
    const audio = document.getElementById("reminderSound");
    if (audio) {
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
      }).catch(() => {});
    }
  }, { once: true });
}

function addInput() {
  const name = document.querySelector(".js-array").value.trim();
  const time = document.querySelector(".time-todo").value;
  const date = document.querySelector(".todo-date").value;
  const priority = document.querySelector(".todo-priority").value;
  const playerId = localStorage.getItem("playerId") || null;
  const username = localStorage.getItem("username") || "";

  if (!name || !time || !date) return alert("Please fill out all fields.");

  const task = { name, time, date, priority, alerted: false, completed: false, playerId, username };
  todoList.push(task);
  localStorage.setItem("todoList", JSON.stringify(todoList));

  fetch("https://todo-notifier.onrender.com/save-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task)
  })
    .then(res => res.json())
    .then(data => console.log("✅ Task saved to Firestore:", data))
    .catch(err => console.error("❌ Backend save failed:", err));

  document.querySelector(".js-array").value = "";
  document.querySelector(".time-todo").value = "";
  document.querySelector(".todo-date").value = "";

  renderHTML();

  requestAnimationFrame(() => {
  const lastCard = document.querySelector(".todoAdded .card:last-child");
  if (lastCard) {
    lastCard.scrollIntoView({ behavior: "smooth", block: "center" });
    lastCard.classList.add("shadow-lg", "border", "border-success");

    // Use transition class for smooth visual effect
    lastCard.style.transition = "all 0.4s ease-in-out";

    setTimeout(() => {
      lastCard.classList.remove("shadow-lg", "border", "border-success");
      lastCard.style.transition = "";
    }, 1000);
  }
});
}

function renderHTML() {
  const container = document.querySelector(".todoAdded");
  container.innerHTML = "";
  todoList.forEach((task, index) => {
    const badgeClass = task.priority === "High" ? "bg-danger" : task.priority === "Medium" ? "bg-warning text-dark" : "bg-success";
    const timeLeft = getTimeLeft(task.date, task.time);

    const card = document.createElement("div");
    card.className = "card mb-3";
    card.innerHTML = `
      <div class="card-body d-flex justify-content-between align-items-center">
        <div>
          <h5 class="card-title mb-1 ${task.completed ? "completed" : ""}">${task.name}</h5>
          <span class="badge ${badgeClass}">${task.priority}</span><br>
          <small class="task-meta">⏰ ${task.time} | 📅 ${task.date}</small><br>
          <span class="countdown">⏳ ${timeLeft}</span>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-success" onclick="toggleComplete(${index})">✔️</button>
          <button class="btn btn-sm btn-outline-secondary" onclick="editTask(${index})">✏️</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTodo(${index})">🗑</button>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

function getTimeLeft(date, time) {
  const now = new Date();
  const target = new Date(`${date}T${time}`);
  const diff = target - now;
  if (diff < 0) return "Due";
  const mins = Math.floor((diff / 1000 / 60) % 60);
  const hrs = Math.floor(diff / 1000 / 60 / 60);
  return `${hrs}h ${mins}m left`;
}

function toggleComplete(index) {
  todoList[index].completed = !todoList[index].completed;
  localStorage.setItem("todoList", JSON.stringify(todoList));
  renderHTML();
}

function deleteTodo(index) {
  todoList.splice(index, 1);
  localStorage.setItem("todoList", JSON.stringify(todoList));
  renderHTML();
}

function editTask(index) {
  currentEditIndex = index;
  const task = todoList[index];
  document.getElementById("editTaskName").value = task.name;
  document.getElementById("editTaskTime").value = task.time;
  document.getElementById("editTaskDate").value = task.date;
  document.getElementById("editTaskPriority").value = task.priority;
  new bootstrap.Modal(document.getElementById("editModal")).show();
}

function saveEdit() {
  if (currentEditIndex === null) return;
  const task = todoList[currentEditIndex];
  task.name = document.getElementById("editTaskName").value;
  task.time = document.getElementById("editTaskTime").value;
  task.date = document.getElementById("editTaskDate").value;
  task.priority = document.getElementById("editTaskPriority").value;
  localStorage.setItem("todoList", JSON.stringify(todoList));
  renderHTML();
  bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
}

function saveUsername() {
  const name = document.getElementById("usernameInput").value.trim();
  if (name) {
    localStorage.setItem("username", name);
    document.getElementById("usernameStatus").textContent = `Saved as: ${name}`;
    bootstrap.Modal.getInstance(document.getElementById("usernameModal")).hide();
  }
}

function updateNotifStatus() {
  const statusText = document.getElementById("notifStatus");
  const toggleBtn = document.getElementById("toggleNotifBtn");
  if (window.OneSignal) {
    OneSignal.isPushNotificationsEnabled().then(enabled => {
      statusText.textContent = enabled ? "✅ Subscribed" : "❌ Not Subscribed";
      toggleBtn.textContent = enabled ? "🔕 Unsubscribe" : "🔔 Subscribe";
    }).catch(() => {
      statusText.textContent = "❌ Error";
    });
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("toggleNotifBtn").addEventListener("click", () => {
      OneSignal.isPushNotificationsEnabled().then(enabled => {
        if (enabled) {
          OneSignal.setSubscription(false).then(updateNotifStatus);
        } else {
          OneSignal.registerForPushNotifications().then(updateNotifStatus);
        }
      });
    });
    document.getElementById("notificationModal").addEventListener("show.bs.modal", updateNotifStatus);
  });
}

window.onload = () => {
  renderHTML();
  const savedDark = localStorage.getItem("darkMode");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (savedDark === "true" || (savedDark === null && prefersDark)) {
    document.body.classList.add("dark-mode");
    document.getElementById("toggleDarkModeSwitch").checked = true;
    document.querySelector(".slider .icon").textContent = "☀️";
  } else {
    document.querySelector(".slider .icon").textContent = "🌙";
  }

  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("✅ SW registered:", reg.scope))
      .catch(err => console.warn("❌ SW failed:", err));
  }
};

// 🌙 Dark mode manual toggle
const darkToggle = document.getElementById("toggleDarkModeSwitch");
darkToggle.addEventListener("change", function () {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  document.querySelector(".slider .icon").textContent = this.checked ? "☀️" : "🌙";
});