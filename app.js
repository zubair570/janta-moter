const DEMO_PASSWORD = "car";
let mediaDB;

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createCard({ emoji, title, description, titleTag = "h3" }) {
  const card = createElement("div", "card");
  if (emoji) card.appendChild(createElement("div", "emoji", emoji));
  card.appendChild(createElement(titleTag, "", title));
  card.appendChild(createElement("p", "", description));
  return card;
}

function renderServices() {
  const services = [
    ["🚘", "Four Wheeler", "Car driving training for beginners and learners with AC/NON AC has different price."],
    ["🏍️", "Bike Training", "Practical practicing for the two-wheeler only on gearless scooters like an Activa with driving lessons."],
    ["🛵", "Scooter Training", "Learn scooter riding with confidence."],
    ["🛺", "Three Wheeler", "Three-wheeler driving training."],
    ["📋", "Temporary / Learner Licence", "Guidance for two-wheeler and four-wheeler learner licence applications."],
    ["🪪", "Permanent Licence", "Guidance for permanent driving licence applications and RTO procedures."],
    ["👨‍🏫", "Class Detail", "Safe driving skills and confidence through practical training of 1 hour or 30min per day with weekly THEORY CLASS"]
  ];
  const container = document.getElementById("serviceCards");
  services.forEach(([emoji, title, description]) => {
    container.appendChild(createCard({
      emoji,
      title,
      description,
      titleTag: title === "Class Detail" ? "h4" : "h3"
    }));
  });
}

function renderTrainingTags() {
  const tags = ["Manual & Automatic", "Hatchback", "Sedan", "SUV", "City Driving", "Highway Driving", "Parking Practice"];
  const container = document.getElementById("trainingTags");
  tags.forEach(tag => container.appendChild(createElement("span", "", tag)));
}

function getStoredReviews() {
  return JSON.parse(localStorage.getItem("jannnataReviews") || "[]");
}

function showReviews() {
  const container = document.getElementById("reviewList");
  container.innerHTML = "";
  getStoredReviews().slice().reverse().forEach(review => {
    const card = createCard({
      title: review.name,
      description: "★".repeat(Number(review.rating)) + "☆".repeat(5 - Number(review.rating))
    });
    card.appendChild(createElement("p", "", review.review));
    container.appendChild(card);
  });
}

function setupForms() {
  document.getElementById("bookingForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const values = {
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      service: document.getElementById("service").value,
      date: document.getElementById("date").value,
      message: document.getElementById("message").value
    };
    const text = `Hello JANNNATA Motor Training School!\n\nName: ${values.name}\nPhone: ${values.phone}\nService: ${values.service}\nPreferred Date: ${values.date}\nMessage: ${values.message}`;
    window.open("https://wa.me/919821198950?text=" + encodeURIComponent(text), "_blank");
  });

  document.getElementById("reviewForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const reviews = getStoredReviews();
    reviews.push({
      name: document.getElementById("reviewName").value,
      rating: document.getElementById("rating").value,
      review: document.getElementById("reviewText").value
    });
    localStorage.setItem("jannnataReviews", JSON.stringify(reviews));
    showReviews();
    this.reset();
  });
  showReviews();
}

function adminLogin() {
  const password = document.getElementById("adminPassword").value;
  if (password === DEMO_PASSWORD) {
    sessionStorage.setItem("demoAdmin", "yes");
    showAdminPanel();
  } else {
    document.getElementById("loginMessage").textContent = "Incorrect password!";
  }
}

function showAdminPanel() {
  document.getElementById("admin-login").hidden = true;
  document.getElementById("admin-panel").hidden = false;
  showGallery();
}

function adminLogout() {
  sessionStorage.removeItem("demoAdmin");
  document.getElementById("admin-login").hidden = false;
  document.getElementById("admin-panel").hidden = true;
  document.getElementById("adminPassword").value = "";
}

function uploadMedia() {
  const files = document.getElementById("mediaFiles").files;
  if (!files.length) {
    alert("Please select photos or videos first.");
    return;
  }
  const validFiles = Array.from(files).filter(file =>
    file.type.startsWith("image/") || file.type.startsWith("video/")
  );
  if (!validFiles.length) {
    alert("Please select valid image or video files.");
    return;
  }
  let completed = 0;
  validFiles.forEach(file => {
    const transaction = mediaDB.transaction(["media"], "readwrite");
    transaction.objectStore("media").add({ name: file.name, type: file.type, file });
    transaction.oncomplete = function () {
      completed++;
      if (completed === validFiles.length) {
        document.getElementById("uploadMessage").textContent = "Media uploaded successfully!";
        document.getElementById("mediaFiles").value = "";
        showGallery();
      }
    };
    transaction.onerror = function () {
      alert("Upload failed. The file may be too large.");
    };
  });
}

function showGallery() {
  if (!mediaDB) return;
  const gallery = document.getElementById("adminGallery");
  if (!gallery) return;
  gallery.innerHTML = "";
  const transaction = mediaDB.transaction(["media"], "readonly");
  transaction.objectStore("media").openCursor().onsuccess = function (event) {
    const cursor = event.target.result;
    if (cursor) {
      const item = cursor.value;
      const card = createElement("div", "admin-item");
      const media = createElement(item.type.startsWith("image/") ? "img" : "video");
      media.src = URL.createObjectURL(item.file);
      if (media.tagName === "VIDEO") media.controls = true;
      card.appendChild(media);
      card.appendChild(createElement("p", "", item.name));
      const deleteButton = createElement("button", "delete-btn", "Delete");
      deleteButton.onclick = function () { deleteMedia(item.id); };
      card.appendChild(deleteButton);
      gallery.appendChild(card);
      cursor.continue();
    }
  };
}

function deleteMedia(id) {
  if (!confirm("Are you sure you want to delete this media?")) return;
  const transaction = mediaDB.transaction(["media"], "readwrite");
  transaction.objectStore("media").delete(id);
  transaction.oncomplete = function () { showGallery(); };
}

window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.uploadMedia = uploadMedia;

window.addEventListener("DOMContentLoaded", function () {
  renderServices();
  renderTrainingTags();
  setupForms();

  const request = indexedDB.open("JannnataMediaDB", 1);
  request.onupgradeneeded = function (event) {
    event.target.result.createObjectStore("media", { keyPath: "id", autoIncrement: true });
  };
  request.onsuccess = function (event) {
    mediaDB = event.target.result;
    showGallery();
  };
  request.onerror = function () {
    alert("Unable to open media storage.");
  };
  if (sessionStorage.getItem("demoAdmin") === "yes") showAdminPanel();
});
