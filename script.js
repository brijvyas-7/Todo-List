const todoList = JSON.parse(localStorage.getItem("todoList")) || [];
let currentEditIndex = null;

// Unlock audio on first interaction
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
  const playerId = localStorage.getItem("playerId");

  if (!name || !time || !date) return alert("Please fill out all fields.");

  const taskData = { name, time, date, priority, alerted: false, completed: false, playerId };
  todoList.push(taskData);
  localStorage.setItem("todoList", JSON.stringify(todoList));

  // 🔁 Save to backend
  fetch("https://todo-notifier.onrender.com/save-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(taskData),
  })
    .then(res => res.json())
    .then(data => {
      console.log("✅ Task saved to Firestore:", data);
    })
    .catch(err => {
      console.error("❌ Failed to save task to backend:", err);
    });

  inputEl.value = "";
  timeEl.value = "";
  dateEl.value = "";

  renderHTML();
}

function renderHTML() {
  const container = document.querySelector(".todoAdded");
  container.innerHTML = "";

  todoList.forEach((task, index) => {
    const badgeClass = task.priority === 'High' ? 'bg-danger' :
                      task.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-success';
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
  localStorage.setItem("todoList", JSON.stringify(todoList));
  renderHTML();
}

function deleteTodo(index) {
  todoList.splice(index, 1);
  localStorage.setItem("todoList", JSON.stringify(todoList));
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
  localStorage.setItem("todoList", JSON.stringify(todoList));
  renderHTML();
  bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
}


  document.addEventListener("DOMContentLoaded", () => {
    const statusText = document.getElementById("notifStatus");
    const toggleBtn = document.getElementById("toggleNotifBtn");
    const testBtn = document.getElementById("testNotifBtn");

    function updateNotifStatus() {
      OneSignal.isPushNotificationsEnabled().then(enabled => {
        statusText.textContent = enabled ? "✅ Subscribed" : "❌ Not Subscribed";
        toggleBtn.textContent = enabled ? "🔕 Unsubscribe" : "🔔 Subscribe";
      });
    }

    toggleBtn.addEventListener("click", () => {
      OneSignal.isPushNotificationsEnabled().then(enabled => {
        if (enabled) {
          OneSignal.setSubscription(false).then(updateNotifStatus);
        } else {
          OneSignal.registerForPushNotifications().then(updateNotifStatus);
        }
      });
    });

    testBtn.addEventListener("click", () => {
      OneSignal.sendSelfNotification(
        "📌 Test Notification",
        "This is a local test notification from Todo PWA!",
        null, // URL
        null  // icon
      );
    });

    // Refresh on modal open
    document.getElementById("notificationModal").addEventListener("show.bs.modal", updateNotifStatus);
  });


  localStorage.setItem("todoList", JSON.stringify(todoList));
  renderHTML();

  if (!found) {
    console.log("✅ No due tasks at this check.");
  }
}

// 🌗 Dark Mode
const darkToggle = document.getElementById("toggleDarkModeSwitch");
const icon = document.querySelector(".slider .icon");

darkToggle.addEventListener("change", function () {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
  icon.textContent = this.checked ? "☀️" : "🌙";
});

// 🚀 On Load
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

  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then(reg => console.log("✅ SW registered:", reg.scope))
      .catch(err => console.warn("❌ SW registration failed:", err));
  }
};

// 🔁 Reminder loop
setInterval(checkReminders, 10000);
