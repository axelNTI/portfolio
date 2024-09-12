$(() => {
  document.cookie = "jsEnabled=true";
  const ws = new WebSocket("ws://localhost:8080?=404");
});
