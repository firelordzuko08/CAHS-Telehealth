// ElderCare Telehealth v2 – interactivity (vanilla JS)
document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Safe storage helpers (storage can be blocked or throw)
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {
        /* ignore */
      }
    },
  };

  const mb = document.getElementById("menuBtn"),
    ul = document.getElementById("navList");
  mb.addEventListener("click", () => {
    const open = ul.classList.toggle("show");
    mb.setAttribute("aria-expanded", open);
  });
  ul.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      ul.classList.remove("show");
      mb.setAttribute("aria-expanded", "false");
    }),
  );

  let size = parseInt(store.get("ec-size"), 10) || 115;
  const setSize = (n) => {
    size = Math.max(100, Math.min(160, n));
    root.style.setProperty("--fs", size / 100 + "rem");
    store.set("ec-size", size);
  };
  setSize(size);
  document.getElementById("fMinus").onclick = () => setSize(size - 10);
  document.getElementById("fReset").onclick = () => setSize(115);
  document.getElementById("fPlus").onclick = () => setSize(size + 10);

  const themeBtn = document.getElementById("themeBtn"),
    contrastBtn = document.getElementById("contrastBtn");
  const applyTheme = (dark) => {
    root.dataset.theme = dark ? "dark" : "light";
    themeBtn.setAttribute("aria-pressed", dark);
    themeBtn.querySelector("span").textContent = dark ? "Light" : "Dark";
    store.set("ec-theme", dark ? "dark" : "light");
  };
  const applyContrast = (on) => {
    if (on) root.dataset.contrast = "high";
    else delete root.dataset.contrast;
    contrastBtn.setAttribute("aria-pressed", on);
    store.set("ec-contrast", on ? "high" : "normal");
  };
  const savedTheme = store.get("ec-theme");
  applyTheme(
    savedTheme
      ? savedTheme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches,
  );
  applyContrast(store.get("ec-contrast") === "high");
  themeBtn.onclick = () => applyTheme(root.dataset.theme !== "dark");
  contrastBtn.onclick = () => applyContrast(root.dataset.contrast !== "high");

  document
    .querySelectorAll(".svc")
    .forEach((c) =>
      c.addEventListener("click", () =>
        c.setAttribute(
          "aria-expanded",
          c.getAttribute("aria-expanded") !== "true",
        ),
      ),
    );

  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  document.querySelectorAll(".art").forEach((art) => {
    const rm = art.querySelector(".rm"),
      bar = art.querySelector(".meter i"),
      listen = art.querySelector(".listen");
    rm.addEventListener("click", () => {
      const open = art.classList.toggle("open");
      rm.setAttribute("aria-expanded", open);
      rm.textContent = open ? "Show Less" : "Read More";
      if (!open && synth) synth.cancel();
    });
    const updateBar = () => {
      if (!art.classList.contains("open")) return;
      const r = art.getBoundingClientRect(),
        vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (r.height + vh)));
      bar.style.width = p * 100 + "%";
    };
    addEventListener("scroll", updateBar, { passive: true });
    if (listen) {
      if (!synth) {
        listen.style.display = "none";
        return;
      }
      listen.addEventListener("click", () => {
        if (synth.speaking) {
          synth.cancel();
          return;
        }
        const text =
          art.querySelector("h3").textContent +
          ". " +
          [...art.querySelectorAll("p:not(.refs), h4, li")]
            .map((n) => n.textContent.replace(/\([^)]*\d{4}[^)]*\)/g, ""))
            .join(". ");
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9;
        u.lang = "en-US";
        synth.speak(u);
      });
    }
  });

  const top = document.getElementById("top");
  const links = [
    ...ul.querySelectorAll("a"),
    ...document.querySelectorAll(".bottombar a"),
  ];
  const onScroll = () => {
    top.style.display = scrollY > 500 ? "block" : "none";
    let cur = null,
      best = -1e9;
    document.querySelectorAll("main section[id]").forEach((s) => {
      const t = s.getBoundingClientRect().top;
      if (t < 160 && t > best) {
        best = t;
        cur = s.id;
      }
    });
    links.forEach((a) => a.classList.toggle("active", a.hash === "#" + cur));
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  top.onclick = () =>
    scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });

  const items = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window))
    items.forEach((el) => el.classList.add("in"));
  else {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    items.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 80 + "ms";
      io.observe(el);
    });
  }

  document.querySelectorAll("[data-count]").forEach((el) => {
    if (reduce) return;
    const target = +el.dataset.count,
      suffix = el.dataset.suffix || "",
      final = el.textContent;
    if (final.startsWith("1 in")) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          const t0 = performance.now();
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / 1200);
            el.textContent = Math.round(target * p) + suffix;
            if (p < 1) requestAnimationFrame(tick);
            else el.textContent = final;
          };
          requestAnimationFrame(tick);
        }),
      { threshold: 0.6 },
    );
    io.observe(el);
  });

  const f = document.getElementById("cform"),
    msg = document.getElementById("formMsg");
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true,
      first = null;
    f.querySelectorAll("input,textarea").forEach((el) => {
      const err = document.getElementById(el.id + "Err");
      let m = "";
      if (!el.value.trim()) m = "Please fill in this field.";
      else if (el.type === "email" && !/^\S+@\S+\.\S+$/.test(el.value))
        m = "Please enter a valid email address.";
      err.textContent = m;
      el.setAttribute("aria-invalid", !!m);
      if (m) {
        ok = false;
        first = first || el;
      }
    });
    msg.classList.remove("show");
    if (ok) {
      msg.innerHTML =
        '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg><span>Thank you!</span>';
      void msg.offsetWidth;
      msg.classList.add("show");
      f.reset();
    } else if (first) first.focus();
  });
  document.getElementById("year").textContent = new Date().getFullYear();
});
