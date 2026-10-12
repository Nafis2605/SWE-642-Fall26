// Author: Fahim Arsad Nafis
// Link: https://www.linkedin.com/in/fahim-arsad/
// SWE 642 - Assignment 2

const COOKIE_NAME = "visitorName";
const COOKIE_DAYS = 7;

// letters only, a space is ok between words (John Smith)
const NAME_PATTERN = /^[A-Za-z]+( [A-Za-z]+)*$/;
const STREET_PATTERN = /^[A-Za-z0-9 .,#-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const ZIP_PATTERN = /^\d{5}$/;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

const form = document.getElementById("surveyForm");
const submitBtn = document.getElementById("submitBtn");
const nameBox = document.getElementById("fullName");
const zipBox = document.getElementById("zip");
const zipMsg = document.getElementById("zipMsg");
const cityOut = document.getElementById("city");
const stateOut = document.getElementById("state");
const dataBox = document.getElementById("data");
const dataMsg = document.getElementById("dataMsg");
const avgOut = document.getElementById("average");
const maxOut = document.getElementById("maximum");
const infoTab = document.getElementById("info-tab");
const surveyTab = document.getElementById("survey-tab");

let zipList = null;
let zipBusy = false;
let submitAfterZip = false;


// cookies
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = name + "=" + encodeURIComponent(value) +
    "; expires=" + expires.toUTCString() + "; path=/";
}

function getCookie(name) {
  const parts = document.cookie.split(";");
  for (let i = 0; i < parts.length; i++) {
    const pair = parts[i].trim();
    if (pair.indexOf(name + "=") === 0) {
      return decodeURIComponent(pair.substring(name.length + 1));
    }
  }
  return "";
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good Morning";
  } else if (hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

// returns null if the user hits cancel
function askForName() {
  let name = prompt("Please enter your name:");
  while (name !== null) {
    name = name.trim();
    if (NAME_PATTERN.test(name)) {
      return name;
    }
    name = prompt("Your name can only contain letters. Please enter your name:");
  }
  return null;
}

function showGreeting() {
  let name = getCookie(COOKIE_NAME);

  if (!name) {
    name = askForName();
    if (name) {
      setCookie(COOKIE_NAME, name, COOKIE_DAYS);
    }
  }

  const greeting = document.getElementById("greeting");
  const link = document.getElementById("changeName");

  if (name) {
    greeting.textContent = getGreeting() + " " + name + ", welcome to SWE642 Survey";
    link.textContent = "Not " + name + "? Click here to enter your name.";
    if (!nameBox.value) {
      nameBox.value = name;
    }
  } else {
    greeting.textContent = getGreeting() + ", welcome to SWE642 Survey";
    link.textContent = "Click here to enter your name.";
  }
}

function changeName(event) {
  event.preventDefault();
  const name = askForName();
  if (name) {
    setCookie(COOKIE_NAME, name, COOKIE_DAYS);
    nameBox.value = name;
    location.reload();
  }
}


// data field
function parseData(text) {
  const values = text.split(",").map(function (v) {
    return v.trim();
  }).filter(function (v) {
    return v !== "";
  });

  if (values.length < 10) {
    return { error: "Data needs at least ten numbers separated by commas (found " + values.length + ")." };
  }

  const nums = [];
  for (let i = 0; i < values.length; i++) {
    const n = Number(values[i]);
    if (!/^\d+(\.\d+)?$/.test(values[i]) || n < 1 || n > 100) {
      return { error: "Data value \"" + values[i] + "\" is not a number from 1 to 100." };
    }
    nums.push(n);
  }
  return { nums: nums };
}

function clearStats() {
  avgOut.value = "";
  maxOut.value = "";
  dataMsg.textContent = "";
}

function computeStats() {
  clearStats();
  if (dataBox.value.trim() === "") {
    return;
  }

  const result = parseData(dataBox.value);
  if (result.error) {
    dataMsg.textContent = result.error;
    return;
  }

  let sum = 0;
  let max = result.nums[0];
  for (let i = 0; i < result.nums.length; i++) {
    sum += result.nums[i];
    if (result.nums[i] > max) {
      max = result.nums[i];
    }
  }

  avgOut.value = Math.round(sum / result.nums.length * 100) / 100;
  maxOut.value = max;
}


// zip lookup
function clearAddress() {
  cityOut.textContent = "";
  stateOut.textContent = "";
  zipMsg.textContent = "";
}

function findZip(zip) {
  if (!zipList) {
    return null;
  }
  for (let i = 0; i < zipList.length; i++) {
    if (zipList[i].zip === zip) {
      return zipList[i];
    }
  }
  return null;
}

function showCityState(responseText, zip) {
  zipList = JSON.parse(responseText).zipcodes;

  // ignore it if the zip was changed while waiting
  if (zipBox.value.trim() !== zip) {
    return;
  }

  const match = findZip(zip);
  if (match) {
    cityOut.textContent = match.city;
    stateOut.textContent = match.state;
  } else {
    zipMsg.textContent = "Invalid zip";
  }
}

function lookupZip() {
  const zip = zipBox.value.trim();
  clearAddress();
  if (zip === "") {
    return;
  }
  if (!ZIP_PATTERN.test(zip)) {
    zipMsg.textContent = "Invalid zip";
    return;
  }

  zipBusy = true;
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) {
      return;
    }
    zipBusy = false;

    if (xhr.status === 200) {
      showCityState(xhr.responseText, zip);
    } else {
      zipMsg.textContent = "Could not load zip codes, try again.";
    }

    if (submitAfterZip) {
      submitAfterZip = false;
      submitBtn.click();
    }
  };
  xhr.open("GET", "zipcodes.json", true);
  xhr.send();
}


// submit button
function validateForm(event) {
  // nothing is actually posted, S3 only hosts static files
  event.preventDefault();

  // if the zip hasn't been looked up yet, do that first and come back
  const zip = zipBox.value.trim();
  if (zipBusy || (ZIP_PATTERN.test(zip) && cityOut.textContent === "" && zipMsg.textContent === "")) {
    submitAfterZip = true;
    if (!zipBusy) {
      lookupZip();
    }
    return false;
  }

  const errors = [];
  const badFields = [];

  function fail(message, field) {
    errors.push(message);
    badFields.push(field);
  }

  const name = nameBox.value.trim();
  if (!NAME_PATTERN.test(name)) {
    fail("Name can only contain letters.", nameBox);
  }

  const username = document.getElementById("username");
  if (username.value.trim() === "") {
    fail("Username is required.", username);
  }

  const email = document.getElementById("email");
  if (!EMAIL_PATTERN.test(email.value.trim())) {
    fail("E-mail address is not valid (example: jdoe@example.com).", email);
  }

  const phone = document.getElementById("phone");
  if (!/^\d{3}-\d{3}-\d{4}$/.test(phone.value.trim())) {
    fail("Telephone number should look like 703-555-1234.", phone);
  }

  const street = document.getElementById("street");
  if (!STREET_PATTERN.test(street.value.trim())) {
    fail("Street address can only contain letters, numbers, spaces and . , # -", street);
  }

  if (!ZIP_PATTERN.test(zip)) {
    fail("Zip must be 5 digits.", zipBox);
  } else if (!findZip(zip) && cityOut.textContent === "") {
    fail("Zip " + zip + " is not a valid zip code.", zipBox);
  }

  const website = document.getElementById("website");
  if (website.value.trim() !== "" && !website.checkValidity()) {
    fail("URL should start with http:// or https://", website);
  }

  const surveyDate = document.getElementById("surveyDate");
  if (surveyDate.value === "") {
    fail("Please pick the date of the survey.", surveyDate);
  }

  const gradMonth = document.getElementById("gradMonth");
  if (MONTHS.indexOf(gradMonth.value.trim()) === -1) {
    fail("Please pick a graduation month from the list.", gradMonth);
  }

  const gradYear = document.getElementById("gradYear");
  if (!/^(19|20)\d{2}$/.test(gradYear.value.trim())) {
    fail("Graduation year should be four digits, like 2024.", gradYear);
  }

  const dataResult = parseData(dataBox.value);
  if (dataResult.error) {
    fail(dataResult.error, dataBox);
  }

  const liked = form.querySelectorAll("input[name='liked']");
  const likedCount = form.querySelectorAll("input[name='liked']:checked").length;
  if (likedCount < 2) {
    fail("Please check at least two things you liked about the campus.", liked[0]);
  }

  if (!form.querySelector("input[name='interest']:checked")) {
    fail("Please select how you became interested in the university.",
      document.getElementById("srcFriends"));
  }

  const recommend = document.getElementById("recommend");
  if (recommend.value === "") {
    fail("Please choose how likely you are to recommend the school.", recommend);
  }

  if (errors.length > 0) {
    alert("Please fix the following:\n\n- " + errors.join("\n- "));
    clearFields(badFields);
    badFields[0].focus();
    return false;
  }

  alert("Thank you, " + name + "! Your survey has been submitted.");
  form.reset();
  return true;
}

// only clear the fields that were wrong
function clearFields(fields) {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];

    if (field.type === "checkbox") {
      form.querySelectorAll("input[name='" + field.name + "']").forEach(function (box) {
        box.checked = false;
      });
    } else if (field.tagName === "SELECT") {
      field.selectedIndex = 0;
    } else if (field.type !== "radio") {
      field.value = "";
    }

    if (field === zipBox) {
      clearAddress();
    }
    if (field === dataBox) {
      clearStats();
    }
  }
}


// tabs
function showSurveyTab() {
  bootstrap.Tab.getOrCreateInstance(surveyTab).show();
}

function closeMenu() {
  const menu = bootstrap.Collapse.getInstance(document.getElementById("mainNav"));
  if (menu) {
    menu.hide();
  }
}

surveyTab.addEventListener("shown.bs.tab", function () {
  history.replaceState(null, "", "#survey");
  window.scrollTo(0, 0);
  nameBox.focus();
});

infoTab.addEventListener("shown.bs.tab", function () {
  history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo(0, 0);
});

infoTab.addEventListener("click", closeMenu);
surveyTab.addEventListener("click", closeMenu);

document.getElementById("surveyLink").addEventListener("click", function (event) {
  event.preventDefault();
  showSurveyTab();
});


zipBox.onblur = lookupZip;
dataBox.onblur = computeStats;
submitBtn.onclick = validateForm;
document.getElementById("changeName").onclick = changeName;

form.addEventListener("reset", function () {
  submitAfterZip = false;
  clearAddress();
  clearStats();
});

window.addEventListener("load", function () {
  // coming back after a name change, stay on the survey
  if (location.hash === "#survey") {
    showSurveyTab();
  }

  // wait a moment so the page is drawn before the prompt shows up
  setTimeout(function () {
    showGreeting();
    if (location.hash === "#survey") {
      nameBox.focus();
    }
  }, 100);
});
