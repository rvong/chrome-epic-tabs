let color = '#3aa757';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ color });
  console.log('Default background color set to %cgreen', `color: ${color}`);
});


// background page
//chrome.runtime.sendMessage({toSay: "Hello Richard"}, function() {});
chrome.runtime.onMessage.addListener(function(request) {
  chrome.tts.speak(request.toSay, {
    rate: 0.8,
    onEvent: function(event) {
      console.log('the event');
      console.log(event);
    }
  },
  function(e) {
    console.log(e);
  });
});
