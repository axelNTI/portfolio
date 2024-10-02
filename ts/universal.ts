const sendViewportDimensions = () => {
  const width = $(window).width();
  const height = $(window).height();
  const rem = parseFloat($("html").css("font-size"));
  $.ajax({
    url: "POST/viewport",
    method: "POST",
    data: {
      width,
      height,
      rem,
    },
  });
};

const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

$(() => {
  $(".script").css({
    display: "block", // Perhaps change this to "initial"?
  });
  sendViewportDimensions();
  $(window).on("resize", debounce(sendViewportDimensions, 200));
});
