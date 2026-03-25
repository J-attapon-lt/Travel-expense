(function () {
  "use strict";

  const tripContainer = document.getElementById("tripContainer");
  const pdfSheet = document.getElementById("pdfSheet");
  const tripTemplate = document.getElementById("tripTemplate");

  function q(id) {
    return document.getElementById(id);
  }

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }

  function money(v) {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2
    }).format(v || 0);
  }

  function diffHours(startDate, startTime, endDate, endTime) {
    if (!startDate || !startTime || !endDate || !endTime) return 0;
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const ms = end - start;
    return ms > 0 ? ms / 3600000 : 0;
  }

  function allowanceRate(hours) {
    if (hours >= 3 && hours <= 6) return 100;
    if (hours > 6 && hours <= 8) return 150;
    if (hours > 8 && hours <= 12) return 200;
    if (hours > 12) return 300;
    return 0;
  }

  function calculateMileage(km) {
    km = num(km);
    if (km <= 0) return 0;
    if (km <= 80) return km * 6.09;
    return (80 * 6.09) + ((km - 80) * 4.06);
  }

  function numberToThaiText(number) {
    number = Number(number || 0).toFixed(2);
    const [integer, decimal] = number.split(".");
    const txtNumArr = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const txtDigitArr = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    function readNumber(numStr) {
      let result = "";
      if (parseInt(numStr, 10) === 0) return "";
      for (let i = 0; i < numStr.length; i++) {
        const n = parseInt(numStr[i], 10);
        const pos = numStr.length - i - 1;
        if (n === 0) continue;
        if (pos === 0 && n === 1 && numStr.length > 1) {
          result += "เอ็ด";
        } else if (pos === 1 && n === 2) {
          result += "ยี่";
        } else if (pos === 1 && n === 1) {
          result += "";
        } else {
          result += txtNumArr[n];
        }
        result += txtDigitArr[pos];
      }
      return result;
    }

    if (parseFloat(number) === 0) return "ศูนย์บาทถ้วน";
    const bahtText = readNumber(integer) + "บาท";
    if (parseInt(decimal, 10) === 0) return bahtText + "ถ้วน";
    return bahtText + readNumber(decimal) + "สตางค์";
  }

  function formatDateThai(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat("th-TH").format(date);
  }

  function checkbox(checked) {
    return `<span style="display:inline-block;width:14px;height:14px;border:1px solid #000;vertical-align:middle;text-align:center;line-height:12px;font-size:11px;font-weight:700;">${checked ? "✓" : ""}</span>`;
  }

  function fill(value, cls = "wide") {
    return `<span class="pdf-line-fill ${cls}">${escapeHtml(value || "")}</span>`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getTripCards() {
    return Array.from(document.querySelectorAll(".trip-card"));
  }

  function getTripData(card) {
    const departDate = card.querySelector(".trip-departDate").value;
    const departTime = card.querySelector(".trip-departTime").value;
    const returnDate = card.querySelector(".trip-returnDate").value;
    const returnTime = card.querySelector(".trip-returnTime").value;
    const manualHours = card.querySelector(".trip-hours").value;
    const computedHours = manualHours !== "" ? num(manualHours) : diffHours(departDate, departTime, returnDate, returnTime);

    return {
      enabled: card.querySelector(".trip-enabled").checked,
      type: card.querySelector(".trip-type").value,
      jobType: card.querySelector(".trip-jobType").value,
      place: card.querySelector(".trip-place").value,
      districtProvince: card.querySelector(".trip-districtProvince").value,
      topic: card.querySelector(".trip-topic").value,
      departFrom: card.querySelector(".trip-departFrom").value,
      departDate,
      departTime,
      returnTo: card.querySelector(".trip-returnTo").value,
      returnDate,
      returnTime,
      hours: computedHours,
      days: num(card.querySelector(".trip-days").value)
    };
  }

  function refreshTripIndexes() {
    getTripCards().forEach((card, i) => {
      const badge = card.querySelector(".trip-index");
      if (badge) badge.textContent = `รายการที่ ${i + 1}`;
    });
  }

  function toggleMeetingFields(card) {
    const typeSelect = card.querySelector(".trip-type");
    const meetingOnly = card.querySelector(".meeting-only");
    if (typeSelect.value === "meeting") {
      meetingOnly.classList.remove("hidden");
    } else {
      meetingOnly.classList.add("hidden");
    }
  }

  function bindTripCard(card) {
    const inputs = card.querySelectorAll("input, select");
    inputs.forEach((el) => {
      el.addEventListener("input", recalculate);
      el.addEventListener("change", recalculate);
    });

    const typeSelect = card.querySelector(".trip-type");
    typeSelect.addEventListener("change", () => toggleMeetingFields(card));

    const removeBtn = card.querySelector(".trip-remove-btn");
    removeBtn.addEventListener("click", () => {
      card.remove();
      refreshTripIndexes();
      recalculate();
    });

    toggleMeetingFields(card);
  }

  function addTrip(defaultType = "inspection") {
    const node = tripTemplate.content.firstElementChild.cloneNode(true);
    const typeSelect = node.querySelector(".trip-type");
    typeSelect.value = defaultType;
    bindTripCard(node);
    tripContainer.appendChild(node);
    refreshTripIndexes();
    recalculate();
  }

  function getAllFormInputs() {
    return document.querySelectorAll(
      "#requester, #companion, #allowance, #meetingFee, #lodgingNights, #lodging, #companyVehicleFuel, #publicTransport, #privateDistanceKm, #privateVehicleFuel, #otherLabel, #otherAmount, #attachmentsCount, #remarks, #claimerName, #claimerDate, #approverName, #approverDate, #payeeName, #payeeDate, #receiverName, #receiverDate, #autoAllowance, #autoLodging, #autoPrivateVehicle"
    );
  }

  function renderInspectionTrip(order, trip) {
    if (!trip) {
      return `
        <div class="pdf-row compact"><strong>${order}</strong> ${checkbox(false)} ตรวจยาง ${checkbox(false)} ขึ้นยาง (สถานที่ปฏิบัติงาน/อำเภอ/จังหวัด) ${fill("", "wide")}</div>
        <div class="pdf-row compact" style="padding-left:26px;">ได้ออกเดินทางจากบริษัท/บ้านพัก ${fill("", "mid")} วันที่/เดือน/พ.ศ. ${fill("", "mid")} เวลา ${fill("", "short")}</div>
        <div class="pdf-row compact" style="padding-left:26px;">กลับมาถึงบริษัท/บ้านพัก วันที่/เดือน/พ.ศ. ${fill("", "mid")} เวลา ${fill("", "short")} รวมเวลาไปปฏิบัติงาน ${fill("", "short")} วัน ${fill("", "short")} ชม.</div>
      `;
    }

    return `
      <div class="pdf-row compact"><strong>${order}</strong> ${checkbox(trip.jobType === "ตรวจงาน")} ตรวจยาง ${checkbox(trip.jobType === "ขึ้นยาง")} ขึ้นยาง (สถานที่ปฏิบัติงาน/อำเภอ/จังหวัด) ${fill([trip.place, trip.districtProvince].filter(Boolean).join(" / "), "wide")}</div>
      <div class="pdf-row compact" style="padding-left:26px;">ได้ออกเดินทางจากบริษัท/บ้านพัก ${fill(trip.departFrom, "mid")} วันที่/เดือน/พ.ศ. ${fill(formatDateThai(trip.departDate), "mid")} เวลา ${fill(trip.departTime, "short")}</div>
      <div class="pdf-row compact" style="padding-left:26px;">กลับมาถึงบริษัท/บ้านพัก วันที่/เดือน/พ.ศ. ${fill(formatDateThai(trip.returnDate), "mid")} เวลา ${fill(trip.returnTime, "short")} รวมเวลาไปปฏิบัติงาน ${fill(num(trip.days).toFixed(0), "short")} วัน ${fill(num(trip.hours).toFixed(1), "short")} ชม.</div>
    `;
  }

  function renderMeetingTrip(trip) {
    if (!trip) {
      return `
        <div class="pdf-row compact"><strong>2.4</strong> เข้าร่วมประชุม/สัมมนา/อบรม/อื่นๆ(ระบุ) ${fill("", "mid")} เรื่อง ${fill("", "wide")}</div>
        <div class="pdf-row compact" style="padding-left:26px;">(สถานที่ปฏิบัติงาน/อำเภอ/จังหวัด) ${fill("", "wide")}</div>
        <div class="pdf-row compact" style="padding-left:26px;">ได้ออกเดินทางจากบริษัท/บ้านพัก ${fill("", "mid")} วันที่/เดือน/พ.ศ. ${fill("", "mid")} เวลา ${fill("", "short")}</div>
        <div class="pdf-row compact" style="padding-left:26px;">กลับมาถึงบริษัท/บ้านพัก วันที่/เดือน/พ.ศ. ${fill("", "mid")} เวลา ${fill("", "short")} รวมเวลาไปปฏิบัติงาน ${fill("", "short")} วัน ${fill("", "short")} ชม.</div>
      `;
    }

    return `
      <div class="pdf-row compact"><strong>2.4</strong> เข้าร่วมประชุม/สัมมนา/อบรม/อื่นๆ(ระบุ) ${fill(trip.jobType, "mid")} เรื่อง ${fill(trip.topic, "wide")}</div>
      <div class="pdf-row compact" style="padding-left:26px;">(สถานที่ปฏิบัติงาน/อำเภอ/จังหวัด) ${fill([trip.place, trip.districtProvince].filter(Boolean).join(" / "), "wide")}</div>
      <div class="pdf-row compact" style="padding-left:26px;">ได้ออกเดินทางจากบริษัท/บ้านพัก ${fill(trip.departFrom, "mid")} วันที่/เดือน/พ.ศ. ${fill(formatDateThai(trip.departDate), "mid")} เวลา ${fill(trip.departTime, "short")}</div>
      <div class="pdf-row compact" style="padding-left:26px;">กลับมาถึงบริษัท/บ้านพัก วันที่/เดือน/พ.ศ. ${fill(formatDateThai(trip.returnDate), "mid")} เวลา ${fill(trip.returnTime, "short")} รวมเวลาไปปฏิบัติงาน ${fill(num(trip.days).toFixed(0), "short")} วัน ${fill(num(trip.hours).toFixed(1), "short")} ชม.</div>
    `;
  }

  function buildPDFHtml() {
    const trips = getTripCards().map(getTripData).filter((t) => t.enabled);

    const fixedTrips = [0, 1, 2].map((i) => trips[i] || null);
    const meetingTrip = trips.find((t) => t.type === "meeting") || trips[3] || null;

    const rows = [
      ["3.1", "ค่าเบี้ยเลี้ยง", q("allowance").value || "0.00"],
      ["3.2", "ค่าอาหาร ในการเข้าร่วมประชุมสัมมนา (กรณีผู้จัดเลี้ยงไม่เลี้ยงอาหาร)", q("meetingFee").value || "0.00"],
      ["3.3", "ค่าที่พัก แบบประหยัด (ตามที่จ่ายจริง)", q("lodging").value || "0.00"],
      ["3.4", "ค่าพาหนะ /ค่าน้ำมันเชื้อเพลิง (กรณีใช้รถบริษัท)", q("companyVehicleFuel").value || "0.00"],
      ["3.5", "ค่าพาหนะ (กรณีเดินทางโดยรถสาธารณะ)", q("publicTransport").value || "0.00"],
      ["3.6", "ค่าพาหนะ /ค่าน้ำมันเชื้อเพลิง (กรณีเดินทางโดยรถยนต์ส่วนบุคคล)", q("privateVehicleFuel").value || "0.00"],
      ["3.7", `${escapeHtml(q("otherLabel").value || "อื่นๆ")} ระบุ................................................`, q("otherAmount").value || "0.00"]
    ];

    return `
      <div class="pdf-title">แบบฟอร์มขอเบิกค่าใช้จ่ายในการเดินทางไปปฏิบัติงานนอกสถานที่</div>
      <div class="pdf-sub">ตรวจยาง/ขึ้นยาง/เข้าร่วมประชุม/ สัมมนา/ อบรม/อื่นๆ</div>

      <div class="pdf-row">1. ข้าพเจ้า นาย/นาง/นางสาว ${fill(q("requester").value, "wide")} พร้อมด้วย นาย/นาง/นางสาว ${fill(q("companion").value, "wide")}</div>
      <div class="pdf-row">2. ได้รับอนุมัติให้ไปปฏิบัติงานนอกสถานที่ ดังนี้</div>

      ${renderInspectionTrip("2.1", fixedTrips[0])}
      ${renderInspectionTrip("2.2", fixedTrips[1])}
      ${renderInspectionTrip("2.3", fixedTrips[2])}
      ${renderMeetingTrip(meetingTrip)}

      <div class="pdf-row compact" style="padding-left:26px;"><strong>รวมเวลาไปปฏิบัติงานทั้งสิ้น</strong> ${fill(q("sumDays").textContent.replace(" วัน", ""), "short")} วัน ${fill(q("sumHours").textContent.replace(" ชม.", ""), "short")} ชม.</div>

      <div class="pdf-row" style="margin-top:4px;">3. จึงขอเบิกค่าใช้จ่าย ดังนี้</div>
      <table class="pdf-table">
        <thead>
          <tr>
            <th style="width:58px">ลำดับ</th>
            <th>รายการ</th>
            <th style="width:150px">รวมเป็นเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `<tr><td style="text-align:center">${r[0]}</td><td>${r[1]}</td><td style="text-align:right">${money(num(r[2]))}</td></tr>`).join("")}
          <tr>
            <td colspan="2"><strong>รวมเป็นเงิน (ตัวอักษร)</strong> ${escapeHtml(q("thaiText").textContent)}</td>
            <td style="text-align:right"><strong>${escapeHtml(q("sumMoney").textContent)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="pdf-row" style="margin-top:4px;">ได้แนบหลักฐานการเบิกจ่ายมาพร้อมนี้ จำนวน ${fill(q("attachmentsCount").value, "short")} ฉบับ</div>

      <div class="pdf-sign-grid">
        <div class="pdf-sign-box">
          ลงชื่อ.................................................ผู้ขอเบิกจ่าย<br>
          (${fill(q("claimerName").value, "mid")})<br>
          วันที่ ${fill(formatDateThai(q("claimerDate").value), "mid")}
        </div>
        <div class="pdf-sign-box">
          ลงชื่อ.................................................ผู้อนุมัติ<br>
          (${fill(q("approverName").value, "mid")})<br>
          วันที่ ${fill(formatDateThai(q("approverDate").value), "mid")}
        </div>
        <div class="pdf-sign-box">
          ลงชื่อ.................................................ผู้จ่ายเงิน<br>
          (${fill(q("payeeName").value, "mid")})<br>
          วันที่ ${fill(formatDateThai(q("payeeDate").value), "mid")}
        </div>
        <div class="pdf-sign-box">
          ลงชื่อ.................................................ผู้รับเงิน<br>
          (${fill(q("receiverName").value, "mid")})<br>
          วันที่ ${fill(formatDateThai(q("receiverDate").value), "mid")}
        </div>
      </div>

      <div class="pdf-row" style="margin-top:2px;">หมายเหตุ:</div>
      <table class="pdf-rates">
        <tr>
          <th colspan="4">อัตราค่าเบี้ยเลี้ยง</th>
          <th colspan="2">อัตราค่าพาหนะกรณีเดินทางโดยรถยนต์ส่วนบุคคล</th>
          <th rowspan="2">ค่าที่พัก</th>
        </tr>
        <tr>
          <th>ระยะเวลาปฏิบัติงาน/อัตราค่าเบี้ยเลี้ยง</th>
          <th>6-8 ชม.</th>
          <th>8-12 ชม.</th>
          <th>เกิน 12 ชม.</th>
          <th>ระยะทาง/อัตราค่าน้ำมันเชื้อเพลิง</th>
          <th>81 กม.ต่อไป</th>
        </tr>
        <tr>
          <td>3-6 ชม.<br>100 บาท</td>
          <td>150 บาท</td>
          <td>200 บาท</td>
          <td>300 บาท</td>
          <td>0- 80 กม.<br>6.09 บาทต่อ กม.</td>
          <td>4.06 บาทต่อ กม.</td>
          <td>วันละ<br>700 บาท</td>
        </tr>
      </table>
      <div class="pdf-note">HR-016/PM-HR-01/แก้ไขเมื่อ 1-07-68</div>
    `;
  }

  function syncPDF() {
    pdfSheet.innerHTML = buildPDFHtml();
  }

  function recalculate() {
    const trips = getTripCards().map(getTripData);
    const activeTrips = trips.filter((t) => t.enabled);

    const totalHours = activeTrips.reduce((sum, t) => sum + num(t.hours), 0);
    const totalDays = activeTrips.reduce((sum, t) => sum + num(t.days), 0);
    const allowanceAuto = activeTrips.reduce((sum, t) => sum + allowanceRate(num(t.hours)), 0);
    const lodgingAuto = num(q("lodgingNights").value) * 700;
    const privateAuto = calculateMileage(q("privateDistanceKm").value);

    const allowance = q("autoAllowance").checked ? allowanceAuto : num(q("allowance").value);
    const lodging = q("autoLodging").checked ? lodgingAuto : num(q("lodging").value);
    const privateVehicle = q("autoPrivateVehicle").checked ? privateAuto : num(q("privateVehicleFuel").value);

    q("allowance").value = q("autoAllowance").checked ? allowance.toFixed(2) : q("allowance").value;
    q("lodging").value = q("autoLodging").checked ? lodging.toFixed(2) : q("lodging").value;
    q("privateVehicleFuel").value = q("autoPrivateVehicle").checked ? privateVehicle.toFixed(2) : q("privateVehicleFuel").value;

    q("allowance").readOnly = q("autoAllowance").checked;
    q("lodging").readOnly = q("autoLodging").checked;
    q("privateVehicleFuel").readOnly = q("autoPrivateVehicle").checked;

    const total = allowance
      + num(q("meetingFee").value)
      + lodging
      + num(q("companyVehicleFuel").value)
      + num(q("publicTransport").value)
      + privateVehicle
      + num(q("otherAmount").value);

    q("sumHours").textContent = `${totalHours.toFixed(1)} ชม.`;
    q("sumDays").textContent = `${totalDays.toFixed(0)} วัน`;
    q("sumMoney").textContent = money(total);
    q("thaiText").textContent = numberToThaiText(total);

    syncPDF();
  }

  async function exportPDF() {
    syncPDF();

    const element = document.getElementById("pdfSheet");
    const requester = q("requester").value
      ? q("requester").value.trim().replace(/\s+/g, "_")
      : "travel_expense";

    const canvas = await window.html2canvas(element, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 4;
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
    heightLeft -= usableHeight;

    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
      heightLeft -= usableHeight;
    }

    pdf.save(`${requester}_travel_expense.pdf`);
  }

  function initGlobalBindings() {
    q("addTripBtn").addEventListener("click", () => addTrip("inspection"));
    q("exportPdfBtn").addEventListener("click", exportPDF);

    getAllFormInputs().forEach((el) => {
      el.addEventListener("input", recalculate);
      el.addEventListener("change", recalculate);
    });
  }

  initGlobalBindings();
  addTrip("inspection");
  addTrip("inspection");
  addTrip("meeting");
  recalculate();
})();