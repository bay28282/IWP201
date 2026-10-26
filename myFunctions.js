/* ==========================================================
   myFunctions.js - ملف جافاسكريبت الوحيد في الموقع
   يحوي جميع التوابع اللازمة (التحقق، الحساب، التفاعل، jQuery)
   ========================================================== */

var DISCOUNT_LIMIT_DAYS = 10;   // الخصم عند تجاوز هذه المدة
var DISCOUNT_RATE = 0.05;       // نسبة الخصم 5%
var MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ---------------------------------------------------------
   توابع مساعدة
   --------------------------------------------------------- */

// تحويل الأرقام العربية-الهندية (٠١٢...) إلى أرقام لاتينية
function toLatinDigits(text) {
  var arabic = "٠١٢٣٤٥٦٧٨٩";
  var result = "";
  for (var i = 0; i < text.length; i++) {
    var index = arabic.indexOf(text.charAt(i));
    result += (index >= 0) ? String(index) : text.charAt(i);
  }
  return result;
}

// تنسيق المبلغ مع فواصل الآلاف
function formatMoney(value) {
  var n = Math.round(value).toString();
  var out = "";
  var count = 0;
  for (var i = n.length - 1; i >= 0; i--) {
    out = n.charAt(i) + out;
    count++;
    if (count % 3 === 0 && i > 0) {
      out = "," + out;
    }
  }
  return out + " ل.س";
}

// استخراج الرقم من نص السعر (مثال: "250000 ل.س" -> 250000)
function parsePrice(text) {
  var digits = toLatinDigits(text).replace(/[^0-9]/g, "");
  return parseInt(digits, 10);
}

/* ---------------------------------------------------------
   توابع التحقق من صحة المدخلات
   كل تابع يعيد نص الخطأ، أو "" إذا كانت القيمة صحيحة
   --------------------------------------------------------- */

// الاسم الكامل: أحرف هجائية عربية ومسافات فقط (اختياري)
function validateName(value) {
  if (value === "") {
    return "";
  }
  var pattern = /^[ء-غف-يٱپچژکگی ]+$/;
  if (!pattern.test(value)) {
    return "يجب أن يحتوي الاسم على أحرف عربية ومسافات فقط (بدون أرقام أو رموز).";
  }
  if (value.replace(/ /g, "").length < 3) {
    return "الاسم قصير جداً.";
  }
  return "";
}

// الرقم الوطني: 11 خانة، أول خانتين = رمز المحافظة من 01 إلى 14 (إلزامي)
function validateNationalId(value) {
  if (value === "") {
    return "الرقم الوطني إلزامي.";
  }
  if (!/^[0-9]+$/.test(value)) {
    return "الرقم الوطني يجب أن يتكون من أرقام فقط.";
  }
  if (value.length !== 11) {
    return "الرقم الوطني يجب أن يتكون من 11 خانة (المُدخل: " + value.length + ").";
  }
  var province = parseInt(value.substring(0, 2), 10);
  if (province < 1 || province > 14) {
    return "أول خانتين من الرقم الوطني ترمزان إلى المحافظة ويجب أن تكونا بين 01 و 14.";
  }
  return "";
}

// تحويل نص بصيغة yyyy-mm-dd إلى كائن تاريخ، أو null إذا كانت الصيغة/التاريخ غير صحيح
function parseDate(value) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m === null) {
    return null;
  }
  var y = parseInt(m[1], 10);
  var mo = parseInt(m[2], 10);
  var d = parseInt(m[3], 10);
  var date = new Date(Date.UTC(y, mo - 1, d));
  // التأكد من أن التاريخ موجود فعلاً (مثلاً 2025-02-30 مرفوض)
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

// تاريخ البداية (إلزامي)
function validateStartDate(value) {
  if (value === "") {
    return "تاريخ بداية التأجير إلزامي.";
  }
  if (parseDate(value) === null) {
    return "الصيغة غير صحيحة، يجب أن يكون التاريخ بالشكل yyyy-mm-dd وتاريخاً حقيقياً.";
  }
  return "";
}

// تاريخ النهاية (إلزامي ويجب أن يكون لاحقاً للبداية)
function validateEndDate(value, startValue) {
  if (value === "") {
    return "تاريخ نهاية التأجير إلزامي.";
  }
  var end = parseDate(value);
  if (end === null) {
    return "الصيغة غير صحيحة، يجب أن يكون التاريخ بالشكل yyyy-mm-dd وتاريخاً حقيقياً.";
  }
  var start = parseDate(startValue);
  if (start !== null && end.getTime() <= start.getTime()) {
    return "تاريخ النهاية يجب أن يكون لاحقاً لتاريخ البداية.";
  }
  return "";
}

// رقم الموبايل: Syriatel (093, 098, 099) أو MTN (094, 095, 096) (اختياري)
function validateMobile(value) {
  if (value === "") {
    return "";
  }
  var cleaned = value.replace(/[ \-]/g, "");
  var pattern = /^(?:\+963|00963|0)9(?:3|4|5|6|8|9)[0-9]{7}$/;
  if (!pattern.test(cleaned)) {
    return "رقم غير صحيح. يجب أن يطابق شبكة Syriatel (093، 098، 099) أو MTN (094، 095، 096) مثل 0933123456.";
  }
  return "";
}

// البريد الإلكتروني (اختياري)
function validateEmail(value) {
  if (value === "") {
    return "";
  }
  var pattern = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/;
  if (!pattern.test(value)) {
    return "البريد الإلكتروني غير صحيح (مثال: name@example.com).";
  }
  return "";
}

/* ---------------------------------------------------------
   الحساب
   --------------------------------------------------------- */

// عدد أيام التأجير بين تاريخين
function countDays(startValue, endValue) {
  var start = parseDate(startValue);
  var end = parseDate(endValue);
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

// حساب الفاتورة: مصفوفة السيارات المختارة + عدد الأيام
function calculateInvoice(cars, days) {
  var subtotal = 0;
  for (var i = 0; i < cars.length; i++) {
    cars[i].days = days;
    cars[i].cost = cars[i].price * days;
    subtotal += cars[i].cost;
  }
  var discount = 0;
  if (days > DISCOUNT_LIMIT_DAYS) {
    discount = subtotal * DISCOUNT_RATE;
  }
  return { subtotal: subtotal, discount: discount, finalTotal: subtotal - discount };
}

/* ---------------------------------------------------------
   التفاعل مع عناصر الصفحة (JavaScript + jQuery)
   --------------------------------------------------------- */

// قراءة السيارات المختارة من الجدول
function getSelectedCars() {
  var cars = [];
  $("#carsTable input.chk-select:checked").each(function () {
    var row = $(this).closest("tr");
    cars.push({
      code: row.find("td.code").text(),
      model: row.find("td.model").text(),
      price: parsePrice(row.find("td.price").text())
    });
  });
  return cars;
}

// تحديث قائمة السيارات المختارة داخل النموذج
function refreshSelectedList() {
  var cars = getSelectedCars();
  var list = $("#selectedList");
  list.empty();
  for (var i = 0; i < cars.length; i++) {
    var item = $("<li></li>");
    item.text(cars[i].model + " (" + cars[i].code + ") - " + formatMoney(cars[i].price) + " / يوم");
    list.append(item);
  }
}

// عرض رسالة خطأ بجانب الحقل
function showError(fieldId, message) {
  var field = $("#" + fieldId);
  $("#err_" + fieldId).text(message);
  if (message !== "") {
    field.addClass("invalid");
  } else {
    field.removeClass("invalid");
  }
}

// قراءة قيمة حقل بعد تنظيفها (حذف المسافات الزائدة وتحويل الأرقام)
function readField(fieldId, keepArabicDigits) {
  var v = $.trim($("#" + fieldId).val());
  if (!keepArabicDigits) {
    v = toLatinDigits(v);
  }
  return v;
}

// التحقق من كامل النموذج، تعيد true عند صحة جميع الحقول
function validateForm() {
  var errors = {};
  errors.fullName = validateName(readField("fullName", true));
  errors.nationalId = validateNationalId(readField("nationalId", false));
  errors.startDate = validateStartDate(readField("startDate", false));
  errors.endDate = validateEndDate(readField("endDate", false), readField("startDate", false));
  errors.mobile = validateMobile(readField("mobile", false));
  errors.email = validateEmail(readField("email", false));

  var ok = true;
  for (var id in errors) {
    if (errors.hasOwnProperty(id)) {
      showError(id, errors[id]);
      if (errors[id] !== "") {
        ok = false;
      }
    }
  }
  return ok;
}

// بناء وعرض نافذة النتيجة
function showResult() {
  var cars = getSelectedCars();
  var startValue = readField("startDate", false);
  var endValue = readField("endDate", false);
  var days = countDays(startValue, endValue);
  var invoice = calculateInvoice(cars, days);
  var name = readField("fullName", true);

  var box = $("#resultBox");
  box.empty();
  box.append($("<h2></h2>").text("تم استلام طلب الحجز بنجاح"));

  if (name !== "") {
    box.append($("<p></p>").text("مقدم الطلب: " + name));
  }
  box.append($("<p></p>").text("الفترة: من " + startValue + " إلى " + endValue + " (" + days + " يوم)"));

  var table = $('<table class="list"></table>');
  table.append("<tr><th>الرمز</th><th>الموديل</th><th>السعر اليومي</th><th>عدد الأيام</th><th>الإجمالي</th></tr>");
  for (var i = 0; i < cars.length; i++) {
    var tr = $("<tr></tr>");
    tr.append($("<td></td>").text(cars[i].code));
    tr.append($("<td></td>").text(cars[i].model));
    tr.append($("<td></td>").text(formatMoney(cars[i].price)));
    tr.append($("<td></td>").text(cars[i].days));
    tr.append($("<td></td>").text(formatMoney(cars[i].cost)));
    table.append(tr);
  }
  box.append(table);

  var totals = $('<table class="total-table"></table>');
  totals.css("margin-top", "14px");
  totals.append($("<tr></tr>").append($("<td></td>").text("المجموع قبل الخصم")).append($("<td></td>").text(formatMoney(invoice.subtotal))));
  if (invoice.discount > 0) {
    totals.append($('<tr class="discount"></tr>').append($("<td></td>").text("خصم 5% (مدة التأجير أكبر من 10 أيام)")).append($("<td></td>").text("- " + formatMoney(invoice.discount))));
  } else {
    totals.append($("<tr></tr>").append($("<td></td>").text("الخصم (لا يوجد - المدة 10 أيام أو أقل)")).append($("<td></td>").text(formatMoney(0))));
  }
  totals.append($('<tr class="final"></tr>').append($("<td></td>").text("المبلغ النهائي")).append($("<td></td>").text(formatMoney(invoice.finalTotal))));
  box.append(totals);

  box.append($('<div class="actions"></div>').append($('<button type="button" id="closeResult">إغلاق</button>')));
  $("#overlay").fadeIn(250);
}

/* ---------------------------------------------------------
   ربط الأحداث عند جاهزية الصفحة
   --------------------------------------------------------- */
$(document).ready(function () {

  /* ----- عام: ظهور تدريجي للمحتوى ----- */
  $("#content").hide().fadeIn(500);

  /* ----- صفحة من نحن: إظهار/إخفاء تفاصيل الفروع ----- */
  $(".branch h3").click(function () {
    $(this).next(".branch-info").slideToggle(250);
  });

  /* ----- صفحة السيارات ----- */
  if ($("#carsTable").length === 0) {
    return;
  }

  // إظهار/إخفاء التفاصيل (يمكن فتح عدة سيارات معاً)
  $("#carsTable input.chk-details").click(function () {
    var detailsRow = $(this).closest("tr").next("tr.details-row");
    if ($(this).is(":checked")) {
      detailsRow.fadeIn(250);
    } else {
      detailsRow.fadeOut(200);
    }
  });

  // تمييز الصف المختار وتحديث قائمة النموذج
  $("#carsTable input.chk-select").click(function () {
    $(this).closest("tr").toggleClass("selected", $(this).is(":checked"));
    $("#selectMsg").text("");
    if ($("#bookingSection").is(":visible")) {
      if (getSelectedCars().length === 0) {
        $("#bookingSection").slideUp(250);
      } else {
        refreshSelectedList();
      }
    }
  });

  // زر متابعة
  $("#continueBtn").click(function () {
    if (getSelectedCars().length === 0) {
      $("#selectMsg").text("الرجاء اختيار سيارة واحدة على الأقل قبل المتابعة.");
      return;
    }
    $("#selectMsg").text("");
    refreshSelectedList();
    $("#bookingSection").slideDown(300, function () {
      $("html, body").animate({ scrollTop: $("#bookingSection").offset().top - 20 }, 400);
    });
  });

  // التحقق الفوري عند مغادرة الحقل
  $("#fullName").blur(function () { showError("fullName", validateName(readField("fullName", true))); });
  $("#nationalId").blur(function () { showError("nationalId", validateNationalId(readField("nationalId", false))); });
  $("#startDate").blur(function () { showError("startDate", validateStartDate(readField("startDate", false))); });
  $("#endDate").blur(function () { showError("endDate", validateEndDate(readField("endDate", false), readField("startDate", false))); });
  $("#mobile").blur(function () { showError("mobile", validateMobile(readField("mobile", false))); });
  $("#email").blur(function () { showError("email", validateEmail(readField("email", false))); });

  // إرسال النموذج (نعطل تحقق المتصفح الافتراضي ونستخدم تحققنا)
  $("#bookingForm").attr("novalidate", "novalidate");
  $("#bookingForm").submit(function (event) {
    event.preventDefault();
    if (getSelectedCars().length === 0) {
      $("#selectMsg").text("الرجاء اختيار سيارة واحدة على الأقل.");
      return;
    }
    if (validateForm()) {
      showResult();
    }
  });

  // مسح الأخطاء عند إعادة التعيين
  $("#bookingForm").bind("reset", function () {
    $(".error").text("");
    $("#bookingForm input").removeClass("invalid");
  });

  // إغلاق نافذة النتيجة
  $("#overlay").on("click", "#closeResult", function () {
    $("#overlay").fadeOut(200);
  });
  $("#overlay").click(function (event) {
    if (event.target === this) {
      $("#overlay").fadeOut(200);
    }
  });
});
