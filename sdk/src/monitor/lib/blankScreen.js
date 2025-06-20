export function initBlankScreen() {
  //   const observer = new MutationObserver((mutations) => {
  //     mutations.forEach((mutation) => {
  //       console.log(mutation);
  //     });
  //   });
  //   使用 elementsFromPoint 方法检测白屏
  let wrapperElement = ["html", "body", "#app", "#root", "#contanier"];
  let emptyPoints = 0;

  for (let i = 0; i <= 9; i++) {
    let xElement = document.elementFromPoint(
      (window.innerWidth / 10) * i,
      window.innerHeight / 2
    );
    let yElement = document.elementFromPoint(
      window.innerWidth / 2,
      (window.innerHeight / 10) * i
    );

    if (!xElement && !yElement) {
      emptyPoints++;
    }
  }
}
