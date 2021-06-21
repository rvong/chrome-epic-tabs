// Initialize butotn with users's prefered color
let changeColor = document.getElementById("changeColor");

chrome.storage.sync.get("color", ({ color }) => {
  changeColor.style.backgroundColor = color;
  
  console.log("loggin tabs");
  console.log(chrome.tabs);

  console.log("WTF1");
});

// When the button is clicked, inject setPageBackgroundColor into current page
changeColor.addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: setPageBackgroundColor,
  });
});

// The body of this function will be execuetd as a content script inside the
// current page
function setPageBackgroundColor() {
  console.log("loggin tabs");
  console.log(chrome.tabs);


  chrome.storage.sync.get("color", ({ color }) => {
    console.log("setting color");
    document.body.style.backgroundColor = color;
  });
}
