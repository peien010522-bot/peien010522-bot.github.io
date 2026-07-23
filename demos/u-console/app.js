(function () {
  const $ = (id) => document.getElementById(id);
  const toastEl = $("toast");
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  }
  function short(addr) {
    if (!addr) return "-";
    if (addr.length < 14) return addr;
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  }
  function money(n) {
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function randAddr(prefix) {
    return prefix + Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 18);
  }

  // 后台 spender 钱包
  // 手机页状态：idle → connected → approved
  const state = {
    connected: false,
    walletAddr: "",
    phoneStep: "idle", // idle | connected | approving | approved
    phoneAddr: "",
    phoneBal: 1280,
    phoneLabel: "手机钱包 A",
    selectedAuthId: "",
    auths: [],
    phoneTxs: [],
  };

  function currentAuth() {
    return state.auths.find((a) => a.id === state.selectedAuthId) || state.auths[0] || null;
  }

  function renderPhone() {
    const chip = $("phoneWalletChip");
    const banner = $("phoneBanner");
    const step = $("phoneStepText");
    const title = $("phoneTitle");
    const desc = $("phoneDesc");
    const actions = $("phoneActions");
    const live = $("phoneLive");
    const result = $("phoneResultCard");
    const txList = $("phoneTxList");

    // 顶部 chip / 横幅
    if (state.phoneStep === "idle") {
      chip.textContent = "未连接";
      banner.textContent = "流程：连接钱包 → 确认钱包";
      step.textContent = "第 1 步 · 连接钱包";
      title.textContent = "连接钱包";
      desc.textContent = "点下面按钮开始。按提示完成连接和确认（演示假数据）。";
      actions.innerHTML = '<button class="btn btn-primary phone-btn" type="button" id="phoneConnect">连接钱包</button>';
      live.textContent = "未连接";
      result.hidden = true;
      txList.hidden = true;
    } else if (state.phoneStep === "connected") {
      chip.textContent = short(state.phoneAddr);
      banner.textContent = "已连接 · 下一步确认钱包";
      step.textContent = "第 2 步 · 确认钱包";
      title.textContent = "确认钱包";
      desc.textContent = "绑定后台 spender。点按钮模拟钱包确认（假数据）。";
      actions.innerHTML =
        '<button class="btn btn-primary phone-btn" type="button" id="phoneApprove">确认钱包</button>' +
        '<button class="btn btn-ghost phone-btn" type="button" id="phoneReconnect">重连钱包</button>';
      live.textContent = "已连接：" + short(state.phoneAddr);
      result.hidden = true;
      txList.hidden = true;
    } else if (state.phoneStep === "approving") {
      chip.textContent = short(state.phoneAddr);
      banner.textContent = "当前：等待钱包确认";
      step.textContent = "第 2 步 · 钱包确认中";
      title.textContent = "确认钱包交易";
      desc.textContent = "假装弹出钱包确认…";
      actions.innerHTML = '<button class="btn btn-ghost phone-btn" type="button" disabled>确认中…</button>';
      live.textContent = "等待钱包确认…";
      result.hidden = true;
      txList.hidden = true;
    } else {
      // approved
      chip.textContent = short(state.phoneAddr);
      banner.textContent = "确认完成 · 可回后台转账";
      step.textContent = "已完成 · 确认成功";
      title.textContent = "确认成功";
      desc.textContent = "这条记录已进入右边后台。";
      actions.innerHTML =
        '<button class="btn btn-ghost phone-btn" type="button" id="phoneAgain">再来一次</button>';
      live.textContent = "钱包地址：" + short(state.phoneAddr);
      result.hidden = false;
      $("phoneAuthAddr").textContent = short(state.phoneAddr);
      $("phoneAuthAddr").title = state.phoneAddr;
      $("phoneAuthTip").textContent = state.phoneLabel + " · 钱包地址";
      $("phoneBal").textContent = money(state.phoneBal) + " USDT";
      if (!state.phoneTxs.length) {
        $("phoneStatus").textContent = "等待后台转账…";
        txList.hidden = true;
        txList.innerHTML = "";
      } else {
        $("phoneStatus").textContent = "已有转账记录";
        txList.hidden = false;
        txList.innerHTML = state.phoneTxs.slice(0, 4).map((t) => (
          '<div class="phone-item"><div><strong>' + t.title + '</strong><span>' + t.sub + '</span></div><strong style="color:#fb7185">-' + money(t.amount) + '</strong></div>'
        )).join("");
      }
    }

    // bind dynamic buttons
    const c = $("phoneConnect");
    if (c) c.onclick = () => phoneConnect();
    const a = $("phoneApprove");
    if (a) a.onclick = () => phoneApprove();
    const r = $("phoneReconnect");
    if (r) r.onclick = () => phoneConnect(true);
    const again = $("phoneAgain");
    if (again) again.onclick = () => {
      state.phoneStep = "idle";
      state.phoneAddr = "";
      state.phoneTxs = [];
      renderPhone();
      toast("已重置手机页面");
    };
  }

  function phoneConnect(force) {
    state.phoneAddr = randAddr("0xAuth");
    state.phoneStep = "connected";
    state.phoneBal = force ? state.phoneBal : 1280;
    state.phoneLabel = "手机钱包 " + (state.auths.length + 1);
    renderPhone();
    toast("手机钱包已连接（演示）");
  }

  function phoneApprove() {
    if (!state.phoneAddr) {
      toast("请先连接钱包");
      return;
    }
    state.phoneStep = "approving";
    renderPhone();
    // 假确认延迟
    setTimeout(() => {
      state.phoneStep = "approved";
      // 写入后台记录
      const id = "a" + Date.now();
      state.auths.unshift({
        id,
        addr: state.phoneAddr,
        bal: state.phoneBal,
        label: state.phoneLabel,
      });
      state.selectedAuthId = id;
      renderAuthList();
      renderPhone();
      toast("确认成功，已进后台记录");
    }, 700);
  }

  function renderAuthList() {
    if (!state.auths.length) {
      $("authList").innerHTML = '<div class="mini-tip">还没有记录。先去左边手机完成确认。</div>';
      return;
    }
    $("authList").innerHTML = state.auths.map((a) => (
      '<button class="auth-item ' + (a.id === state.selectedAuthId ? "active" : "") + '" type="button" data-auth="' + a.id + '">' +
      '<div><strong>' + a.label + '</strong><span class="mono" title="' + a.addr + '">' + short(a.addr) + '</span></div>' +
      '<div class="right">' + money(a.bal) + ' USDT</div>' +
      '</button>'
    )).join("");
  }

  function setConnected(addr, via) {
    state.connected = true;
    state.walletAddr = addr;
    $("connectTip").textContent = "已连接（" + via + "）· 后台 spender 钱包";
    $("walletAddr").textContent = addr;
    toast("钱包已连接：" + short(addr));
  }

  $("btnConnect").addEventListener("click", () => {
    setConnected(randAddr("0xSpender"), "连接钱包");
  });

  $("btnScan").addEventListener("click", () => {
    $("scanModal").hidden = false;
  });
  $("scanCancel").addEventListener("click", () => {
    $("scanModal").hidden = true;
  });
  $("scanOk").addEventListener("click", () => {
    $("scanModal").hidden = true;
    setConnected(randAddr("0xScanWC"), "扫码连接");
  });

  $("btnConfirm").addEventListener("click", () => {
    if (!state.connected) {
      $("walletAddr").textContent = "未连接。请先点“连接钱包”或“扫码连接”。";
      toast("还没连接钱包");
      return;
    }
    $("walletAddr").textContent = state.walletAddr;
    toast("已确认连接：" + short(state.walletAddr));
  });

  $("btnMax").addEventListener("click", () => {
    const auth = currentAuth();
    if (!auth) {
      toast("还没有记录");
      return;
    }
    $("amountInput").value = String(auth.bal);
    toast("已填入 Max：" + money(auth.bal));
  });

  $("authList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-auth]");
    if (!btn) return;
    state.selectedAuthId = btn.dataset.auth;
    const auth = currentAuth();
    if (auth) {
      // 切到该记录对应手机视图
      state.phoneStep = "approved";
      state.phoneAddr = auth.addr;
      state.phoneBal = auth.bal;
      state.phoneLabel = auth.label;
    }
    renderAuthList();
    renderPhone();
    toast("已选中钱包地址 " + short(auth.addr));
  });

  $("btnRefreshAuth").addEventListener("click", () => {
    renderAuthList();
    toast("记录已刷新（演示）");
  });

  $("btnTransfer").addEventListener("click", () => {
    if (!state.connected) {
      toast("请先连接后台钱包");
      return;
    }
    const amount = Number($("amountInput").value);
    const to = ($("toInput").value || "").trim();
    const auth = currentAuth();
    if (!auth) {
      toast("还没有记录，先去手机确认");
      return;
    }
    if (!(amount > 0)) {
      toast("请填写有效转账额度");
      return;
    }
    if (!to || to.length < 10) {
      toast("请填写收款地址");
      return;
    }
    if (amount > auth.bal) {
      toast("额度不足");
      return;
    }

    auth.bal = Number((auth.bal - amount).toFixed(2));
    // 若当前手机正显示这个地址，同步余额
    if (state.phoneAddr === auth.addr) {
      state.phoneBal = auth.bal;
      state.phoneStep = "approved";
    }
    const hash = "0x" + Math.random().toString(16).slice(2, 10) + "...";
    state.phoneTxs.unshift({
      title: "转出 USDT",
      sub: "到 " + short(to) + " · " + hash,
      amount,
    });
    const tip = $("transferTip");
    if (tip) {
      tip.hidden = false;
      tip.textContent = "已转账 " + money(amount) + " USDT → " + short(to);
    }
    renderAuthList();
    renderPhone();
    toast("转账成功（演示） " + money(amount) + " USDT");
  });

  // 手机/后台互跳
  document.querySelectorAll("[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-jump");
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("jump-flash");
      setTimeout(() => el.classList.remove("jump-flash"), 900);
    });
  });

  // init：不预置记录，逼演示走手机流程
  renderAuthList();
  renderPhone();
})();





// 角标「视频演示」→ 项目2 流程视频
(() => {
  const btn = document.getElementById("openFlowVideo");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const payload = {
      type: "portfolio-open-flow-video",
      demoId: "u-console",
      video: "./flow.mp4",
    };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, "*");
        return;
      }
    } catch (_) {}
    window.open("./flow.mp4", "_blank", "noopener,noreferrer");
  });
})();