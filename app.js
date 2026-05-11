const STORAGE_KEY = "ys916d.records.v1";
const NOTICE_KEY = "ys916d.notices.v1";

const metricMeta = {
  bp: { label: "血压", unit: "mmHg", color: "#0f766e" },
  glucose: { label: "血糖", unit: "mmol/L", color: "#2563eb" },
  uric: { label: "尿酸", unit: "μmol/L", color: "#b7791f" },
  ketone: { label: "血酮", unit: "mmol/L", color: "#c2413b" },
};

const fields = {
  bp: [
    { id: "sys", label: "收缩压", type: "number", min: 70, max: 240, step: 1, value: 128 },
    { id: "dia", label: "舒张压", type: "number", min: 40, max: 140, step: 1, value: 82 },
    { id: "pulse", label: "脉率", type: "number", min: 40, max: 180, step: 1, value: 76 },
  ],
  glucose: [
    { id: "value", label: "血糖", type: "number", min: 1.1, max: 33.3, step: 0.1, value: 6.2 },
    {
      id: "context",
      label: "测量场景",
      type: "select",
      value: "fasting",
      options: [
        ["fasting", "晨起/餐前"],
        ["postMeal", "饭后2小时"],
      ],
    },
  ],
  uric: [{ id: "value", label: "尿酸", type: "number", min: 200, max: 1200, step: 1, value: 420 }],
  ketone: [{ id: "value", label: "血酮", type: "number", min: 0, max: 8, step: 0.1, value: 0.4 }],
};

let activeType = "bp";
let records = loadRecords();
let notices = loadNotices();

const dom = {
  dynamicFields: document.querySelector("#dynamicFields"),
  form: document.querySelector("#recordForm"),
  note: document.querySelector("#noteInput"),
  simulate: document.querySelector("#simulateBtn"),
  chartMetric: document.querySelector("#chartMetric"),
  canvas: document.querySelector("#trendCanvas"),
  history: document.querySelector("#historyList"),
  insights: document.querySelector("#insightList"),
  memoryCount: document.querySelector("#memoryCount"),
  riskTitle: document.querySelector("#riskTitle"),
  riskBadge: document.querySelector("#riskBadge"),
  narrative: document.querySelector("#aiNarrative"),
  alertBand: document.querySelector("#alertBand"),
  alertTitle: document.querySelector("#alertTitle"),
  alertText: document.querySelector("#alertText"),
  notifyNow: document.querySelector("#notifyNow"),
  familyStatus: document.querySelector("#familyStatus"),
  doctorStatus: document.querySelector("#doctorStatus"),
  notifyStatus: document.querySelector("#notifyStatus"),
  latestBp: document.querySelector("#latestBp"),
  latestGlucose: document.querySelector("#latestGlucose"),
  latestUric: document.querySelector("#latestUric"),
  latestKetone: document.querySelector("#latestKetone"),
  deviceMetric: document.querySelector("#deviceMetric"),
  deviceValue: document.querySelector("#deviceValue"),
  deviceUnit: document.querySelector("#deviceUnit"),
  clearDemo: document.querySelector("#clearDemo"),
};

function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    makeRecord("bp", { sys: 128, dia: 82, pulse: 76 }, "晨起安静后", now - day * 7),
    makeRecord("glucose", { value: 6.1, context: "fasting" }, "晨起空腹", now - day * 6),
    makeRecord("uric", { value: 418 }, "早餐前", now - day * 5),
    makeRecord("ketone", { value: 0.4 }, "血糖同步检测", now - day * 5 + 7200000),
    makeRecord("bp", { sys: 134, dia: 86, pulse: 80 }, "工作日傍晚", now - day * 3),
    makeRecord("glucose", { value: 8.4, context: "postMeal" }, "饭后2小时", now - day * 2),
    makeRecord("bp", { sys: 126, dia: 78, pulse: 73 }, "今天晨起", now - 3600000 * 3),
  ];
}

function loadNotices() {
  const saved = localStorage.getItem(NOTICE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  localStorage.setItem(NOTICE_KEY, JSON.stringify(notices));
}

function makeRecord(type, values, note = "", time = Date.now()) {
  const analysis = analyze(type, values);
  return {
    id: `${time}-${Math.random().toString(16).slice(2)}`,
    type,
    values,
    note,
    time,
    status: analysis.status,
    message: analysis.message,
  };
}

function analyze(type, values) {
  if (type === "bp") {
    const { sys, dia } = values;
    if (sys >= 180 || dia >= 120) {
      return { status: "danger", message: "血压达到危急阈值，若伴随胸痛、呼吸困难、麻木、视物异常等症状，应立即急救。" };
    }
    if (sys >= 140 || dia >= 90) return { status: "danger", message: "血压处于高值区间，建议复测并联系医生评估用药或生活方式。" };
    if (sys >= 130 || dia >= 80) return { status: "watch", message: "血压偏高，建议连续记录一周，观察晨起和睡前波动。" };
    if (sys >= 120 && dia < 80) return { status: "watch", message: "收缩压略高，减少盐摄入并保持规律测量。" };
    return { status: "ok", message: "血压在常见正常范围内，保持固定姿势和时间测量。" };
  }

  if (type === "glucose") {
    const { value, context } = values;
    const highLine = context === "postMeal" ? 10 : 7.2;
    if (value < 3.9) return { status: "danger", message: "血糖偏低，请按医生方案处理低血糖并复测。" };
    if (value >= 13.9) return { status: "danger", message: "血糖明显偏高，若身体不适或血酮升高，应尽快联系医生。" };
    if (value > highLine) return { status: "watch", message: "血糖高于常用目标范围，建议记录饮食、运动与用药因素。" };
    return { status: "ok", message: "血糖处于常用目标范围内，继续记录餐前/餐后场景。" };
  }

  if (type === "uric") {
    if (values.value >= 510) return { status: "danger", message: "尿酸明显偏高，若有关节疼痛或肾结石史，请联系医生。" };
    if (values.value >= 420) return { status: "watch", message: "尿酸偏高，建议补充饮水，减少酒精、含糖饮料和高嘌呤饮食。" };
    return { status: "ok", message: "尿酸目前可观察，保持饮水和饮食记录。" };
  }

  if (type === "ketone") {
    if (values.value >= 1.6) return { status: "danger", message: "血酮高，存在酮症酸中毒风险；若血糖也高或身体不适，应立即就医。" };
    if (values.value >= 0.6) return { status: "watch", message: "血酮开始升高，请补水、复测，并关注血糖及不适症状。" };
    return { status: "ok", message: "血酮在常见正常范围内。" };
  }

  return { status: "ok", message: "已记录。" };
}

function renderFields() {
  dom.dynamicFields.innerHTML = "";
  fields[activeType].forEach((item) => {
    const label = document.createElement("label");
    label.className = "field";
    label.innerHTML = `<span>${item.label}</span>`;

    if (item.type === "select") {
      const select = document.createElement("select");
      select.id = item.id;
      item.options.forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
      });
      select.value = item.value;
      label.appendChild(select);
    } else {
      const input = document.createElement("input");
      input.id = item.id;
      input.type = item.type;
      input.min = item.min;
      input.max = item.max;
      input.step = item.step;
      input.value = item.value;
      label.appendChild(input);
    }

    dom.dynamicFields.appendChild(label);
  });
}

function readFormValues() {
  const data = {};
  fields[activeType].forEach((item) => {
    const el = document.querySelector(`#${item.id}`);
    data[item.id] = item.type === "select" ? el.value : Number(el.value);
  });
  return data;
}

function addRecord(type, values, note) {
  const record = makeRecord(type, values, note);
  records.unshift(record);
  if (record.status === "danger") notifyContacts(record, true);
  saveAll();
  render();
}

function simulateRecord() {
  const samples = {
    bp: () => ({ sys: randomInt(116, 148), dia: randomInt(72, 96), pulse: randomInt(64, 88) }),
    glucose: () => ({ value: round(randomInt(48, 128) / 10, 1), context: Math.random() > 0.5 ? "fasting" : "postMeal" }),
    uric: () => ({ value: randomInt(330, 560) }),
    ketone: () => ({ value: round(randomInt(2, 22) / 10, 1) }),
  };
  addRecord(activeType, samples[activeType](), "设备自动同步");
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round(num, places) {
  return Number(num.toFixed(places));
}

function notifyContacts(record, automatic = false) {
  notices.unshift({
    time: Date.now(),
    recordId: record.id,
    type: record.type,
    text: `${metricMeta[record.type].label}警报：${formatRecordValue(record)}。已通知王女士和李医生。`,
    automatic,
  });
  saveAll();
}

function render() {
  records.sort((a, b) => b.time - a.time);
  renderLatest();
  renderRisk();
  renderInsights();
  renderHistory();
  renderChart();
  renderNotices();
}

function latestByType(type) {
  return records.find((record) => record.type === type);
}

function renderLatest() {
  const latest = latestByType("bp") || records[0];
  if (latest) {
    dom.deviceMetric.textContent = metricMeta[latest.type].label;
    dom.deviceValue.textContent = compactValue(latest);
    dom.deviceUnit.textContent = metricMeta[latest.type].unit;
  }

  dom.latestBp.textContent = latestByType("bp") ? formatRecordValue(latestByType("bp")) : "--";
  dom.latestGlucose.textContent = latestByType("glucose") ? formatRecordValue(latestByType("glucose")) : "--";
  dom.latestUric.textContent = latestByType("uric") ? formatRecordValue(latestByType("uric")) : "--";
  dom.latestKetone.textContent = latestByType("ketone") ? formatRecordValue(latestByType("ketone")) : "--";
}

function renderRisk() {
  const topRisk = records.find((record) => record.status === "danger") || records.find((record) => record.status === "watch");
  dom.riskBadge.className = "risk-badge ok";
  dom.riskBadge.textContent = "低风险";
  dom.riskTitle.textContent = "今天状态稳定";
  dom.narrative.textContent = buildNarrative();
  dom.alertBand.hidden = true;

  if (topRisk) {
    const isDanger = topRisk.status === "danger";
    dom.riskBadge.className = `risk-badge ${topRisk.status}`;
    dom.riskBadge.textContent = isDanger ? "需警报" : "需观察";
    dom.riskTitle.textContent = isDanger ? "发现高风险读数" : "发现需要观察的趋势";
    dom.alertBand.hidden = !isDanger;
    dom.alertTitle.textContent = `${metricMeta[topRisk.type].label}异常`;
    dom.alertText.textContent = `${formatRecordValue(topRisk)}，${topRisk.message}`;
  }
}

function buildNarrative() {
  const last7 = records.filter((record) => Date.now() - record.time < 7 * 24 * 60 * 60 * 1000);
  const dangerCount = last7.filter((record) => record.status === "danger").length;
  const watchCount = last7.filter((record) => record.status === "watch").length;
  if (dangerCount) return `近 7 天出现 ${dangerCount} 次高风险读数，AI 已优先保存并准备通知家人/医生。建议复测并按专业医护人员意见处理。`;
  if (watchCount) return `近 7 天有 ${watchCount} 次指标需要观察。应用会持续记住测量时间、场景和备注，帮助发现晨起、餐后或运动后的波动。`;
  return "最近记录完整，未发现高风险读数。继续保持固定时间测量，AI 会记住每次结果并追踪长期趋势。";
}

function renderInsights() {
  dom.memoryCount.textContent = `${records.length} 条`;
  const insights = [];
  const bp = records.filter((r) => r.type === "bp").slice(0, 3);
  const glucose = records.filter((r) => r.type === "glucose").slice(0, 6);
  const uric = latestByType("uric");
  const ketone = latestByType("ketone");

  if (bp.length >= 3) {
    const avgSys = Math.round(bp.reduce((sum, r) => sum + r.values.sys, 0) / bp.length);
    const avgDia = Math.round(bp.reduce((sum, r) => sum + r.values.dia, 0) / bp.length);
    insights.push(["最近三次血压均值", `${avgSys}/${avgDia} mmHg。这个逻辑对应说明书里的记忆查看平均值，适合作为趋势观察，不替代诊断。`]);
  }

  if (glucose.length) {
    const high = glucose.filter((r) => r.status !== "ok").length;
    insights.push(["血糖场景记忆", high ? "检测到餐前/餐后目标外读数，建议把饮食、运动和用药时间写进备注，便于医生回看。" : "血糖记录暂未触发警报，继续区分餐前和饭后2小时。"]);
  }

  if (uric) insights.push(["尿酸建议", uric.status === "ok" ? "继续保持饮水与饮食记录。" : "近期尿酸偏高，优先减少酒精、含糖饮料、动物内脏和部分高嘌呤海鲜。"]);
  if (ketone) insights.push(["血酮建议", ketone.status === "ok" ? "血酮正常时仍建议在生病、血糖很高或身体不适时复测。" : "血酮升高时不要忽略，尤其是同时血糖升高或出现恶心、呕吐、呼吸异常。"]);

  insights.push(["安全边界", "本应用用于记录、提醒和趋势建议；治疗、诊断、用药调整必须由专业医护人员决定。"]);

  dom.insights.innerHTML = insights.map(([title, text]) => `<div class="insight"><strong>${title}</strong><small>${text}</small></div>`).join("");
}

function renderHistory() {
  if (!records.length) {
    dom.history.innerHTML = `<div class="insight"><strong>暂无记录</strong><small>点击模拟同步或手动保存一次监测。</small></div>`;
    return;
  }

  dom.history.innerHTML = records
    .slice(0, 99)
    .map(
      (record) => `
        <div class="history-row">
          <div>
            <strong>${metricMeta[record.type].label} · ${formatRecordValue(record)}</strong>
            <small>${formatDate(record.time)}${record.note ? ` · ${record.note}` : ""}<br>${record.message}</small>
          </div>
          <span class="status-dot ${record.status}"></span>
        </div>
      `
    )
    .join("");
}

function renderChart() {
  const ctx = dom.canvas.getContext("2d");
  const type = dom.chartMetric.value;
  const data = records.filter((record) => record.type === type).slice(0, 14).reverse();
  const width = dom.canvas.width;
  const height = dom.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#dce2e8";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i += 1) {
    const y = (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(42, y);
    ctx.lineTo(width - 18, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#68717d";
  ctx.font = "14px sans-serif";
  if (data.length < 2) {
    ctx.fillText("需要至少 2 条同类记录生成趋势", 42, height / 2);
    return;
  }

  const values = data.map(chartValue);
  const min = Math.min(...values) * 0.92;
  const max = Math.max(...values) * 1.08;
  const range = max - min || 1;
  const stepX = (width - 80) / (values.length - 1);
  const points = values.map((value, index) => ({
    x: 42 + stepX * index,
    y: height - 34 - ((value - min) / range) * (height - 68),
  }));

  ctx.strokeStyle = metricMeta[type].color;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  points.forEach((point, index) => {
    ctx.fillStyle = metricMeta[type].color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    if (index === points.length - 1) {
      ctx.fillStyle = "#1f2328";
      ctx.fillText(`${values[index]} ${metricMeta[type].unit}`, Math.min(point.x - 80, width - 160), point.y - 12);
    }
  });
}

function chartValue(record) {
  if (record.type === "bp") return record.values.sys;
  return record.values.value;
}

function renderNotices() {
  const latest = notices[0];
  if (!latest) {
    dom.notifyStatus.textContent = "待命";
    dom.familyStatus.textContent = "未触发";
    dom.doctorStatus.textContent = "未触发";
    return;
  }

  const text = formatDate(latest.time);
  dom.notifyStatus.textContent = "已通知";
  dom.familyStatus.textContent = text;
  dom.doctorStatus.textContent = text;
}

function formatRecordValue(record) {
  if (record.type === "bp") return `${record.values.sys}/${record.values.dia} mmHg · ${record.values.pulse}次/分`;
  return `${record.values.value} ${metricMeta[record.type].unit}`;
}

function compactValue(record) {
  if (record.type === "bp") return `${record.values.sys}/${record.values.dia}`;
  return String(record.values.value);
}

function formatDate(time) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));
}

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    activeType = button.dataset.type;
    document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
    renderFields();
  });
});

dom.form.addEventListener("submit", (event) => {
  event.preventDefault();
  addRecord(activeType, readFormValues(), dom.note.value.trim());
  dom.note.value = "";
});

dom.simulate.addEventListener("click", simulateRecord);
dom.chartMetric.addEventListener("change", renderChart);
dom.notifyNow.addEventListener("click", () => {
  const danger = records.find((record) => record.status === "danger");
  if (danger) {
    notifyContacts(danger);
    renderNotices();
  }
});

dom.clearDemo.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(NOTICE_KEY);
  records = loadRecords();
  notices = [];
  saveAll();
  render();
});

renderFields();
render();
