const sendViewportDimensions = () => {
  const vw = $(window).width();
  const vh = $(window).height();
  $.ajax({
    url: "",
    method: "POST",
    data: {
      vw,
      vh,
    },
  });
};

const debounce = (func: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

$(() => {
  $(".script").css({
    display: "block",
  });
  sendViewportDimensions();
  $(window).on("resize", debounce(sendViewportDimensions, 200));
});
