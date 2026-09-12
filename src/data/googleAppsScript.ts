export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT: TỰ ĐỘNG ĐỌC THÀNH TÍCH VẬN ĐỘNG VIÊN, LINK PHÔI BACKGROUND VÀ LOGO TỪ SHEET "Setup"
 * 
 * Hướng dẫn cấu trúc Google Sheet:
 * 1. Sheet "Setup":
 *    - Ô A1: Ghi chữ "Background"
 *    - Ô A2: Dán link ảnh phôi chứng nhận (Google Drive, Imgur, v.v.)
 *    - Ô A3 (Dòng 3): Dán link ảnh Logo giải chạy (sẽ tự động thay cho logo trên header trang)
 * 
 * 2. Sheet chứa dữ liệu vận động viên (Sheet còn lại):
 *    - Chứa các cột: BIB, Name, Gender, Distance, OverallRank, GenderRank, AG, AgeGroupRank, GunTime, ChipTime
 * 
 * Hướng dẫn triển khai:
 * 1. Trên Google Sheet, vào Tiện ích mở rộng > Apps Script
 * 2. Xóa hết code cũ, dán toàn bộ đoạn code này vào file Code.gs và bấm biểu tượng Lưu (Save)
 * 3. Bấm "Triển khai" (Deploy) > "Quản lý các bản triển khai" (Manage deployments)
 * 4. Bấm biểu tượng Cây bút (Chỉnh sửa / Edit) > Tại mục "Phiên bản" chọn "Phiên bản mới" (New version)
 *    (Hoặc chọn "Tùy chọn triển khai mới" > Web App > Ai có quyền truy cập: "Bất kỳ ai / Anyone")
 * 5. Bấm "Triển khai" (Deploy) là hoàn tất!
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. ĐỌC LINK ẢNH NỀN VÀ LOGO TỪ SHEET "Setup"
    var backgroundUrl = "";
    var logoUrl = "";
    var setupSheet = ss.getSheetByName("Setup") || ss.getSheetByName("setup") || ss.getSheetByName("Cài đặt");
    if (setupSheet) {
      var setupData = setupSheet.getDataRange().getValues();
      if (setupData.length >= 2) {
        // Tìm cột có tiêu đề "background" hoặc mặc định cột A (cột 0)
        var bgCol = 0;
        var logoCol = -1;
        for (var c = 0; c < setupData[0].length; c++) {
          var headerText = String(setupData[0][c]).toLowerCase();
          if (headerText.indexOf("background") !== -1) {
            bgCol = c;
          }
          if (headerText.indexOf("logo") !== -1) {
            logoCol = c;
          }
        }

        // Dòng 2 (index 1): Link phôi chứng nhận
        backgroundUrl = String(setupData[1][bgCol] || "").trim();

        // Dòng 3 (index 2): Link logo giải chạy theo yêu cầu
        if (setupData.length >= 3) {
          logoUrl = String(setupData[2][bgCol] || "").trim();
        }

        // Nếu có cột riêng tên "Logo" thì ưu tiên cột đó
        if (logoCol !== -1 && setupData.length >= 2) {
          var colLogoVal = String(setupData[1][logoCol] || "").trim();
          if (colLogoVal) logoUrl = colLogoVal;
        }
      }
    }

    // 2. TÌM SHEET CHỨA DỮ LIỆU VẬN ĐỘNG VIÊN (Bỏ qua sheet Setup)
    var sheets = ss.getSheets();
    var dataSheet = null;
    for (var s = 0; s < sheets.length; s++) {
      var sName = sheets[s].getName().toLowerCase();
      if (sName !== "setup" && sName !== "cài đặt" && sName !== "settings") {
        dataSheet = sheets[s];
        break;
      }
    }
    if (!dataSheet) {
      dataSheet = ss.getActiveSheet();
    }

    var data = dataSheet.getDataRange().getValues();
    if (data.length < 2) {
      return jsonResponse({
        success: true,
        backgroundUrl: backgroundUrl,
        total: 0,
        data: [],
        message: "Sheet dữ liệu chưa có hàng thông tin nào"
      });
    }

    var headers = data[0].map(function(h) {
      return String(h).trim().toLowerCase();
    });

    // Tự động tìm vị trí các cột theo tên hoặc dùng vị trí chuẩn
    function findCol(keywords, defaultIndex) {
      for (var i = 0; i < headers.length; i++) {
        for (var k = 0; k < keywords.length; k++) {
          if (headers[i].indexOf(keywords[k]) !== -1) {
            return i;
          }
        }
      }
      return defaultIndex;
    }

    var colBib = findCol(["bib", "số bib"], 0);
    var colName = findCol(["tên", "họ tên", "name", "athlete", "vdv"], 1);
    var colGender = findCol(["giới tính", "gender", "sex"], 2);
    var colDistance = findCol(["cự ly", "distance"], 3);
    var colOverallRank = findCol(["overall", "toàn đoàn", "hạng chung"], 4);
    var colGenderRank = findCol(["gender rank", "hạng giới tính"], 5);
    var colAG = findCol(["ag", "nhóm tuổi", "age group"], 6);
    var colAgeGroupRank = findCol(["age group rank", "hạng lứa tuổi", "hạng nhóm tuổi"], 7);
    var colGunTime = findCol(["guntime", "gun time", "thời gian gun"], 8);
    var colChipTime = findCol(["chiptime", "chip time", "thời gian chip", "net time"], 9);

    var runners = [];
    var searchParam = e && e.parameter && e.parameter.search ? String(e.parameter.search).toLowerCase().trim() : "";
    var bibParam = e && e.parameter && e.parameter.bib ? String(e.parameter.bib).toLowerCase().trim() : "";

    for (var r = 1; r < data.length; r++) {
      var row = data[r];
      var bib = String(row[colBib] !== undefined ? row[colBib] : "").trim();
      var name = String(row[colName] !== undefined ? row[colName] : "").trim();

      if (!bib && !name) continue;

      var gender = String(row[colGender] !== undefined ? row[colGender] : "M").trim();
      var gLower = gender.toLowerCase();
      var normalizedGender = (gLower === "f" || gLower === "nữ" || gLower === "female") ? "F" : "M";

      var rawDistance = String(row[colDistance] !== undefined ? row[colDistance] : "Half Marathon").trim();

      var runnerObj = {
        bib: bib,
        name: name,
        gender: normalizedGender,
        distance: rawDistance,
        overallRank: row[colOverallRank] !== undefined && row[colOverallRank] !== "" ? row[colOverallRank] : "-",
        genderRank: row[colGenderRank] !== undefined && row[colGenderRank] !== "" ? row[colGenderRank] : "-",
        ag: String(row[colAG] !== undefined ? row[colAG] : "-").trim(),
        ageGroupRank: row[colAgeGroupRank] !== undefined && row[colAgeGroupRank] !== "" ? row[colAgeGroupRank] : "-",
        gunTime: formatTime(row[colGunTime]),
        chipTime: formatTime(row[colChipTime]),
        date: "13/09/2026"
      };

      if (bibParam) {
        if (bib.toLowerCase() === bibParam) {
          runners.push(runnerObj);
          break;
        }
      } else if (searchParam) {
        if (bib.toLowerCase().indexOf(searchParam) !== -1 || name.toLowerCase().indexOf(searchParam) !== -1) {
          runners.push(runnerObj);
        }
      } else {
        runners.push(runnerObj);
      }
    }

    return jsonResponse({
      success: true,
      backgroundUrl: backgroundUrl,
      logoUrl: logoUrl,
      total: runners.length,
      data: runners
    });

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function formatTime(val) {
  if (!val) return "--:--:--";
  if (val instanceof Date) {
    var h = ("0" + val.getHours()).slice(-2);
    var m = ("0" + val.getMinutes()).slice(-2);
    var s = ("0" + val.getSeconds()).slice(-2);
    return h + ":" + m + ":" + s;
  }
  return String(val).trim();
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const SAMPLE_SHEET_CSV_TEMPLATE = `BIB,Name,Gender,Distance,OverallRank,GenderRank,AG,AgeGroupRank,GunTime,ChipTime
88881,Bùi Minh Đức,M,Half Marathon,128,94,30-39,32,01:45:20,01:44:12
42195,Nguyễn Văn Long,M,Full Marathon,15,14,30-39,5,02:48:35,02:48:20
42308,Trần Thị Thảo,F,Full Marathon,45,4,20-29,2,03:15:10,03:14:48
21055,Lê Hoàng Nam,M,Half Marathon,56,48,40-49,12,01:38:15,01:37:50
21190,Phạm Minh Trang,F,Half Marathon,89,11,30-39,4,01:52:04,01:51:22
10234,Võ Quốc Huy,M,10KM,24,20,20-29,8,00:44:18,00:44:02
05112,Đặng Thùy Dương,F,5KM,18,6,Under 20,2,00:23:45,00:23:30`;
