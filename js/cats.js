// Котики анкеты. Все нарисованы здесь же, в SVG, чужих картинок нет.
//   зрительница — белая кошка выглядывает из-за нижней полосы: следит глазами за указателем и за тем, что печатают,
//                 моргает, радуется принятому ответу и мотает головой на ошибку;
//   ездок       — серый котёнок с языком сидит на розовой полосе там, где кончается заполненная часть;
//   лапа        — хлопает хлопушкой перед каждым разделом (разметка — clapPaw, стили — .clap-paw);
//   массовка    — в финале из-за полосы вылезают ещё трое и машут.
// При «уменьшить движение» в системе котики стоят на местах и не двигаются.

const FUR = {
  white: { fur: "#fff7fb", earfur: "#fff7fb", ear: "#ffb3d1", cap: "" },
  grey: { fur: "#fbf5f8", earfur: "#a99dab", ear: "#ffb3d1", cap: "#a99dab" },
  cream: { fur: "#ffecd2", earfur: "#f5b877", ear: "#ffc0cf", cap: "#f5b877" },
};

// kind: white | grey | cream; extra: слова через пробел — blep (язык), berry (клубника на голове), shades (очки)
export function cat(kind, extra) {
  const c = FUR[kind] || FUR.white, x = " " + (extra || "") + " ";
  return '<svg class="cat-svg" viewBox="0 0 120 104" aria-hidden="true">' +
    '<g class="c-ear c-ear-l"><path d="M20 47 27 10q2-5 6-2l23 22z" fill="' + c.earfur + '"/><path d="M28 38l3-19 14 12z" fill="' + c.ear + '"/></g>' +
    '<g class="c-ear c-ear-r"><path d="M100 47 93 10q-2-5-6-2L64 30z" fill="' + c.earfur + '"/><path d="M92 38l-3-19-14 12z" fill="' + c.ear + '"/></g>' +
    '<ellipse cx="60" cy="61" rx="45" ry="37" fill="' + c.fur + '"/>' +
    (c.cap ? '<path d="M16 55q3-29 44-32 41 3 44 32-20-13-44-6-24-7-44 6z" fill="' + c.cap + '"/>' : "") +
    '<ellipse class="c-blush" cx="31" cy="73" rx="9" ry="5.500" fill="#ff8fc0"/><ellipse class="c-blush" cx="89" cy="73" rx="9" ry="5.500" fill="#ff8fc0"/>' +
    '<g class="c-eyes">' +
      '<g class="c-eye"><ellipse cx="43" cy="59" rx="7.500" ry="9" fill="#2b1420"/><circle cx="40.500" cy="55.500" r="2.800" fill="#fff"/><circle cx="45.500" cy="62" r="1.300" fill="#fff"/></g>' +
      '<g class="c-eye"><ellipse cx="77" cy="59" rx="7.500" ry="9" fill="#2b1420"/><circle cx="74.500" cy="55.500" r="2.800" fill="#fff"/><circle cx="79.500" cy="62" r="1.300" fill="#fff"/></g>' +
    "</g>" +
    '<g class="c-joy" fill="none" stroke="#2b1420" stroke-width="3.200" stroke-linecap="round"><path d="M36 62q7-10 14 0"/><path d="M70 62q7-10 14 0"/></g>' +
    (x.includes(" shades ") ? '<g class="c-shades"><rect x="27" y="49" width="30" height="20" rx="9" fill="#1d0f17" stroke="#fff" stroke-width="4"/><rect x="63" y="49" width="30" height="20" rx="9" fill="#1d0f17" stroke="#fff" stroke-width="4"/><path d="M57 57h6" stroke="#fff" stroke-width="4"/><path d="M33 55l7-2M69 55l7-2" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/></g>' : "") +
    '<path d="M56.500 67h7l-3.500 4.500z" fill="#ff6fa8" stroke="#ff6fa8" stroke-width="1.500" stroke-linejoin="round"/>' +
    '<path d="M60 72q-5 6-10 1.500M60 72q5 6 10 1.500" fill="none" stroke="#5a2a3f" stroke-width="2" stroke-linecap="round"/>' +
    (x.includes(" blep ") ? '<path class="c-tongue" d="M56.500 75q3.500 9 7 0z" fill="#ff7fb0" stroke="#e85a94" stroke-width=".800"/>' : "") +
    '<path d="M20 67 3 63M20 72 2 74M100 67l17-4M100 72l18 2" stroke="#fff" stroke-opacity=".8" stroke-width="1.400" stroke-linecap="round"/>' +
    (x.includes(" berry ") ? '<g class="c-berry" transform="translate(60 15)"><path d="M0 17C-14 9-14-6-5-7c3 0 5 2 5 2s2-2 5-2c9 1 9 16-5 24z" fill="#ff4f7d"/><path d="M-9-6l7-3 2-5 2 5 7 3-7 1-2 4-2-4z" fill="#6fcf73"/><g fill="#ffe08a"><circle cx="-5" cy="1" r="1"/><circle cx="4" cy="0" r="1"/><circle cx="0" cy="6" r="1"/><circle cx="-3" cy="10" r=".900"/><circle cx="5" cy="6" r=".900"/></g></g>' : "") +
    "</svg>";
}

const paws = (fur) => '<svg viewBox="0 0 120 30" aria-hidden="true"><g fill="' + fur + '"><ellipse cx="33" cy="15" rx="17" ry="12"/><ellipse cx="87" cy="15" rx="17" ry="12"/></g>' +
  '<path d="M27 21v-7M39 21v-7M81 21v-7M93 21v-7" stroke="#f0bcd2" stroke-width="2.400" stroke-linecap="round"/></svg>';
const wave = (fur) => '<svg class="wave" viewBox="0 0 40 70" aria-hidden="true"><rect x="11" y="18" width="18" height="60" rx="9" fill="' + fur + '"/><ellipse cx="20" cy="17" rx="15" ry="14" fill="' + fur + '"/>' +
  '<g fill="#ff8fc0"><ellipse cx="20" cy="20" rx="6" ry="5"/><circle cx="11" cy="11" r="3"/><circle cx="20" cy="7.500" r="3"/><circle cx="29" cy="11" r="3"/></g></svg>';

// лапа для хлопушки: рисуется в координатах её SVG, точка (0, 0) — низ лапы
export const clapPaw = '<g class="clap-paw"><rect x="-17" y="-440" width="34" height="428" rx="17" fill="#fff7fb"/><ellipse cx="0" cy="-15" rx="23" ry="17" fill="#fff7fb"/>' +
  '<path d="M-8-3v-9M8-3v-9" stroke="#f0bcd2" stroke-width="2.500" stroke-linecap="round"/></g>';

export function initCats() {
  const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const peek = $("peek");
  $("peekHead").innerHTML = cat("white") + '<svg class="peek-heart" id="peekHeart"><use href="#i-heart"/></svg>';
  $("peekPaws").innerHTML = paws("#fff7fb");
  $("rider").innerHTML = cat("grey", "blep");
  $("cast").innerHTML =
    '<div class="extra e1">' + cat("grey", "blep") + wave("#fbf5f8") + "</div>" +
    '<div class="extra e2">' + cat("cream", "shades") + "</div>" +
    '<div class="extra e3">' + cat("white", "berry") + wave("#fff7fb") + "</div>";

  function lookAt(x, y) {
    const r = peek.getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 240);
    peek.style.setProperty("--lx", (dx / d * 3.6 * k).toFixed(2) + "px");
    peek.style.setProperty("--ly", (dy / d * 2.8 * k).toFixed(2) + "px");
  }
  const lookField = (t) => {
    if (!t || !t.getBoundingClientRect || t === document.body) return;
    const r = t.getBoundingClientRect();
    lookAt(r.left + Math.min(r.width, 30 + String(t.value || "").length * 11), r.top + r.height / 2);
  };
  if (!calm) {
    window.addEventListener("pointermove", (e) => lookAt(e.clientX, e.clientY), { passive: true });
    document.addEventListener("input", (e) => lookField(e.target), true);
    document.addEventListener("focusin", (e) => lookField(e.target));
    for (const el of [peek, $("rider"), ...$("cast").children]) {             // каждый моргает в своём ритме
      const blink = () => { el.classList.add("blink"); setTimeout(() => el.classList.remove("blink"), 150); setTimeout(blink, 2200 + Math.random() * 4200); };
      setTimeout(blink, 1800 + Math.random() * 2600);
    }
    const twitch = () => { peek.classList.add("twitch"); setTimeout(() => peek.classList.remove("twitch"), 460); setTimeout(twitch, 5000 + Math.random() * 7000); };
    setTimeout(twitch, 6000);
  }
  const pulse = (el, cls, ms) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); clearTimeout(el["_" + cls]); el["_" + cls] = setTimeout(() => el.classList.remove(cls), ms); };

  return {
    happy() { pulse(peek, "happy", 950); },                                   // ответ принят
    nope() { pulse(peek, "nope", 520); },                                     // так не пойдёт
    ride(percent, hop) { $("rider").style.setProperty("--p", percent.toFixed(1)); if (hop) pulse($("rider"), "hop", 520); },
    finale() { document.body.classList.add("wrap"); peek.classList.add("happy", "stay"); },
  };
}
