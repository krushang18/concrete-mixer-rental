const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs").promises;

class ExcelService {
  constructor() {
    this.outputDir = path.join(__dirname, "../../temp/excel");
    this.ensureDirectories();
  }

  // Ensure required directories exist
  async ensureDirectories() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error("Error creating directories:", error);
    }
  }

  // Export customer queries to Excel
  static async exportQueriesToExcel(queries, options = {}) {
    try {
      const service = new ExcelService();

      // Prepare data for Excel
      const excelData = queries.map((query, index) => ({
        "Sr. No.": index + 1,
        "Company Name": query.company_name,
        Email: query.email,
        "Contact Number": query.contact_number,
        "Site Location": query.site_location,
        Duration: query.duration,
        "Work Description": query.work_description,
        Status: query.status.toUpperCase(),
        "Created Date": new Date(query.created_at).toLocaleDateString("en-IN"),
        "Days Ago": query.days_ago || 0,
      }));

      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const colWidths = service.calculateColumnWidths(excelData);
      worksheet["!cols"] = colWidths;

      // Add header styling
      service.styleHeaders(worksheet, Object.keys(excelData[0] || {}));

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Queries");

      // Generate filename
      const filename =
        options.filename || `customer_queries_${service.getDateString()}.xlsx`;
      const filePath = path.join(service.outputDir, filename);

      // Write file
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath,
        filename,
        recordCount: queries.length,
        message: "Excel file generated successfully",
      };
    } catch (error) {
      console.error("Error exporting queries to Excel:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to generate Excel file",
      };
    }
  }

  // Export customers to Excel
  static async exportCustomersToExcel(customers, options = {}) {
    try {
      const service = new ExcelService();

      // Prepare data for Excel
      const excelData = customers.map((customer, index) => ({
        "Sr. No.": index + 1,
        "Company Name": customer.company_name,
        "Contact Person": customer.contact_person || "",
        Email: customer.email || "",
        Phone: customer.phone,
        Address: customer.address || "",
        "Site Location": customer.site_location || "",
        "GST Number": customer.gst_number || "",
        "Total Quotations": customer.total_quotations || 0,
        "Accepted Quotations": customer.accepted_quotations || 0,
        "Average Quotation Amount": customer.avg_quotation_amount || 0,
        "Last Quotation Date": customer.last_quotation_date
          ? new Date(customer.last_quotation_date).toLocaleDateString("en-IN")
          : "",
        "Created Date": new Date(customer.created_at).toLocaleDateString(
          "en-IN"
        ),
      }));

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();

      // Main customers sheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const colWidths = service.calculateColumnWidths(excelData);
      worksheet["!cols"] = colWidths;
      service.styleHeaders(worksheet, Object.keys(excelData[0] || {}));
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

      // Summary sheet
      const summaryData = service.generateCustomerSummary(customers);
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Generate filename
      const filename =
        options.filename || `customers_export_${service.getDateString()}.xlsx`;
      const filePath = path.join(service.outputDir, filename);

      // Write file
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath,
        filename,
        recordCount: customers.length,
        message: "Customer Excel file generated successfully",
      };
    } catch (error) {
      console.error("Error exporting customers to Excel:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to generate customer Excel file",
      };
    }
  }

  // Export quotations to Excel
  static async exportQuotationsToExcel(quotations, options = {}) {
    try {
      const service = new ExcelService();

      // Prepare data for Excel
      const excelData = quotations.map((quotation, index) => ({
        "Sr. No.": index + 1,
        "Quotation Number": quotation.quotation_number,
        "Customer Name": quotation.customer_name,
        "Customer Contact": quotation.customer_contact,
        Machine: `${quotation.machine_number} - ${quotation.machine_name}`,
        "Duration Type": quotation.duration_type.toUpperCase(),
        "Unit Price": quotation.unit_price,
        "Total Amount": quotation.total_amount,
        "Quotation Status": quotation.quotation_status.toUpperCase(),
        "Delivery Status": quotation.delivery_status.toUpperCase(),
        "Created Date": new Date(quotation.created_at).toLocaleDateString(
          "en-IN"
        ),
        "Created By": quotation.created_by_user || "",
        "Days Ago": quotation.days_ago || 0,
      }));

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Main quotations sheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const colWidths = service.calculateColumnWidths(excelData);
      worksheet["!cols"] = colWidths;
      service.styleHeaders(worksheet, Object.keys(excelData[0] || {}));
      XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");

      // Summary sheet with analytics
      const summaryData = service.generateQuotationSummary(quotations);
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Generate filename
      const filename =
        options.filename || `quotations_export_${service.getDateString()}.xlsx`;
      const filePath = path.join(service.outputDir, filename);

      // Write file
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath,
        filename,
        recordCount: quotations.length,
        message: "Quotations Excel file generated successfully",
      };
    } catch (error) {
      console.error("Error exporting quotations to Excel:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to generate quotations Excel file",
      };
    }
  }

  // Export service records to Excel
  static async exportServiceRecordsToExcel(serviceRecords, options = {}) {
    try {
      const service = new ExcelService();

      // Prepare data for Excel
      const excelData = serviceRecords.map((record, index) => ({
        "Sr. No.": index + 1,
        "Service Date": new Date(record.service_date).toLocaleDateString(
          "en-IN"
        ),
        "Machine Number": record.machine_number,
        "Machine Name": record.machine_name,
        "Engine Hours": record.engine_hours || "",
        "Site Location": record.site_location || "",
        Operator: record.operator || "",
        "Services Performed": record.services_performed || "",
        "General Notes": record.general_notes || "",
        "Created By": record.created_by_user || "",
        "Created Date": new Date(record.created_at).toLocaleDateString("en-IN"),
      }));

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Main service records sheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const colWidths = service.calculateColumnWidths(excelData);
      worksheet["!cols"] = colWidths;
      service.styleHeaders(worksheet, Object.keys(excelData[0] || {}));
      XLSX.utils.book_append_sheet(workbook, worksheet, "Service Records");

      // Generate filename
      const filename =
        options.filename || `service_records_${service.getDateString()}.xlsx`;
      const filePath = path.join(service.outputDir, filename);

      // Write file
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath,
        filename,
        recordCount: serviceRecords.length,
        message: "Service records Excel file generated successfully",
      };
    } catch (error) {
      console.error("Error exporting service records to Excel:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to generate service records Excel file",
      };
    }
  }

  // Export machines to Excel
  static async exportMachinesToExcel(machines, options = {}) {
    try {
      const service = new ExcelService();

      // Prepare data for Excel
      const excelData = machines.map((machine, index) => ({
        "Sr. No.": index + 1,
        "Machine Number": machine.machine_number,
        "Machine Name": machine.name,
        Description: machine.description || "",
        "Daily Rate (₹)": machine.priceByDay,
        "Weekly Rate (₹)": machine.priceByWeek,
        "Monthly Rate (₹)": machine.priceByMonth,
        "GST (%)": machine.gst_percentage,
        Status: machine.is_active ? "ACTIVE" : "INACTIVE",
        "Created Date": new Date(machine.created_at).toLocaleDateString(
          "en-IN"
        ),
        "Last Updated": new Date(machine.updated_at).toLocaleDateString(
          "en-IN"
        ),
      }));

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Main machines sheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const colWidths = service.calculateColumnWidths(excelData);
      worksheet["!cols"] = colWidths;
      service.styleHeaders(worksheet, Object.keys(excelData[0] || {}));
      XLSX.utils.book_append_sheet(workbook, worksheet, "Machines");

      // Generate filename
      const filename =
        options.filename || `machines_export_${service.getDateString()}.xlsx`;
      const filePath = path.join(service.outputDir, filename);

      // Write file
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath,
        filename,
        recordCount: machines.length,
        message: "Machines Excel file generated successfully",
      };
    } catch (error) {
      console.error("Error exporting machines to Excel:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to generate machines Excel file",
      };
    }
  }

  // Generate comprehensive business report
  static async generateBusinessReport(reportData, options = {}) {
    try {
      const service = new ExcelService();

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Dashboard summary sheet
      const dashboardData = [
        {
          Metric: "Total Queries",
          Value: reportData.overview?.totalQueries || 0,
        },
        {
          Metric: "Total Machines",
          Value: reportData.overview?.totalMachines || 0,
        },
        {
          Metric: "Total Customers",
          Value: reportData.overview?.totalCustomers || 0,
        },
        {
          Metric: "Total Quotations",
          Value: reportData.overview?.totalQuotations || 0,
        },
        {
          Metric: "Accepted Quotations",
          Value: reportData.quotations?.accepted || 0,
        },
        {
          Metric: "Total Revenue (₹)",
          Value: reportData.quotations?.total_accepted_value || 0,
        },
        { Metric: "Active Machines", Value: reportData.machines?.active || 0 },
        {
          Metric: "New Customers (Month)",
          Value: reportData.customers?.new_this_month || 0,
        },
      ];

      const dashboardSheet = XLSX.utils.json_to_sheet(dashboardData);
      XLSX.utils.book_append_sheet(workbook, dashboardSheet, "Dashboard");

      // Add individual data sheets if provided
      if (reportData.queries && reportData.queries.length > 0) {
        const queriesSheet = XLSX.utils.json_to_sheet(reportData.queries);
        XLSX.utils.book_append_sheet(workbook, queriesSheet, "Queries");
      }

      if (reportData.quotations && reportData.quotations.length > 0) {
        const quotationsSheet = XLSX.utils.json_to_sheet(reportData.quotations);
        XLSX.utils.book_append_sheet(workbook, quotationsSheet, "Quotations");
      }

      if (reportData.customers && reportData.customers.length > 0) {
        const customersSheet = XLSX.utils.json_to_sheet(reportData.customers);
        XLSX.utils.book_append_sheet(workbook, customersSheet, "Customers");
      }

      // Generate filename
      const filename =
        options.filename || `business_report_${service.getDateString()}.xlsx`;
      const filePath = path.join(service.outputDir, filename);

      // Write file
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath,
        filename,
        message: "Business report generated successfully",
      };
    } catch (error) {
      console.error("Error generating business report:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to generate business report",
      };
    }
  }

  // Calculate column widths based on content
  calculateColumnWidths(data) {
    if (!data || data.length === 0) return [];

    const headers = Object.keys(data[0]);
    const widths = headers.map((header) => {
      const maxLength = Math.max(
        header.length,
        ...data.map((row) => String(row[header] || "").length)
      );
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
    });

    return widths;
  }

  // Style headers
  styleHeaders(worksheet, headers) {
    headers.forEach((header, index) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
      if (!worksheet[cellAddress]) return;

      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0081C9" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
  }

  // Generate customer summary
  generateCustomerSummary(customers) {
    const total = customers.length;
    const withGST = customers.filter((c) => c.gst_number).length;
    const totalQuotations = customers.reduce(
      (sum, c) => sum + (c.total_quotations || 0),
      0
    );
    const totalAccepted = customers.reduce(
      (sum, c) => sum + (c.accepted_quotations || 0),
      0
    );

    return [
      { Metric: "Total Customers", Value: total },
      { Metric: "Customers with GST", Value: withGST },
      { Metric: "Customers without GST", Value: total - withGST },
      { Metric: "Total Quotations Generated", Value: totalQuotations },
      { Metric: "Total Quotations Accepted", Value: totalAccepted },
      {
        Metric: "Overall Conversion Rate (%)",
        Value:
          totalQuotations > 0
            ? Math.round((totalAccepted / totalQuotations) * 100)
            : 0,
      },
    ];
  }

  // Generate quotation summary
  generateQuotationSummary(quotations) {
    const total = quotations.length;
    const draft = quotations.filter(
      (q) => q.quotation_status === "draft"
    ).length;
    const sent = quotations.filter((q) => q.quotation_status === "sent").length;
    const accepted = quotations.filter(
      (q) => q.quotation_status === "accepted"
    ).length;
    const rejected = quotations.filter(
      (q) => q.quotation_status === "rejected"
    ).length;
    const totalValue = quotations.reduce(
      (sum, q) => sum + (q.total_amount || 0),
      0
    );
    const acceptedValue = quotations
      .filter((q) => q.quotation_status === "accepted")
      .reduce((sum, q) => sum + (q.total_amount || 0), 0);

    return [
      { Metric: "Total Quotations", Value: total },
      { Metric: "Draft Quotations", Value: draft },
      { Metric: "Sent Quotations", Value: sent },
      { Metric: "Accepted Quotations", Value: accepted },
      { Metric: "Rejected Quotations", Value: rejected },
      { Metric: "Total Quotation Value (₹)", Value: totalValue },
      { Metric: "Accepted Quotation Value (₹)", Value: acceptedValue },
      {
        Metric: "Conversion Rate (%)",
        Value: total > 0 ? Math.round((accepted / total) * 100) : 0,
      },
      {
        Metric: "Average Quotation Value (₹)",
        Value: total > 0 ? Math.round(totalValue / total) : 0,
      },
    ];
  }

  // Get date string for filename
  getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Clean up old Excel files
  static async cleanupOldExcelFiles(daysOld = 30) {
    try {
      const service = new ExcelService();
      const files = await fs.readdir(service.outputDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let deletedCount = 0;

      for (const file of files) {
        if (file.endsWith(".xlsx") || file.endsWith(".xls")) {
          const filePath = path.join(service.outputDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      }

      console.log(`Cleaned up ${deletedCount} old Excel files`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error("Error cleaning up Excel files:", error);
      return { success: false, error: error.message };
    }
  }

  // Get Excel file info
  static async getExcelFileInfo(filename) {
    try {
      const service = new ExcelService();
      const filePath = path.join(service.outputDir, filename);

      try {
        const stats = await fs.stat(filePath);
        return {
          exists: true,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      } catch (error) {
        return {
          exists: false,
          path: filePath,
        };
      }
    } catch (error) {
      console.error("Error getting Excel file info:", error);
      throw error;
    }
  }

  // Convert CSV to Excel
  static async convertCSVToExcel(csvData, filename, options = {}) {
    try {
      const service = new ExcelService();

      // Create workbook from CSV data
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(csvData);

      // Auto-size columns
      const colWidths = service.calculateColumnWidths(csvData);
      worksheet["!cols"] = colWidths;

      // Add header styling
      if (csvData.length > 0) {
        service.styleHeaders(worksheet, Object.keys(csvData[0]));
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        options.sheetName || "Data"
      );

      // Generate filename
      const excelFilename = filename.replace(".csv", ".xlsx");
      const filePath = path.join(service.outputDir, excelFilename);

      // Write file
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath,
        filename: excelFilename,
        recordCount: csvData.length,
        message: "CSV converted to Excel successfully",
      };
    } catch (error) {
      console.error("Error converting CSV to Excel:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to convert CSV to Excel",
      };
    }
  }

  // Read Excel file and convert to JSON
  static async readExcelToJSON(filePath, options = {}) {
    try {
      // Read the Excel file
      const workbook = XLSX.readFile(filePath);

      // Get the first sheet name
      const sheetName = options.sheetName || workbook.SheetNames[0];

      // Get the worksheet
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: options.header || 1,
        range: options.range,
        raw: options.raw || false,
      });

      return {
        success: true,
        data: jsonData,
        sheetNames: workbook.SheetNames,
        recordCount: jsonData.length,
        message: "Excel file read successfully",
      };
    } catch (error) {
      console.error("Error reading Excel file:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to read Excel file",
      };
    }
  }

  // Create Excel template for data import
  static async createImportTemplate(templateType, options = {}) {
    try {
      const service = new ExcelService();

      let templateData = [];
      let filename = "";

      switch (templateType) {
        case "customers":
          templateData = [
            {
              "Company Name": "Sample Company Ltd.",
              "Contact Person": "John Doe",
              Email: "john@example.com",
              Phone: "9876543210",
              Address: "Sample Address",
              "Site Location": "Sample Site",
              "GST Number": "24XXXXX1234X1ZX",
            },
          ];
          filename = "customer_import_template.xlsx";
          break;

        case "machines":
          templateData = [
            {
              "Machine Number": "CMR-001",
              "Machine Name": "Concrete Mixer 5 Cubic Meter",
              Description: "High capacity concrete mixer",
              "Daily Rate": 2500,
              "Weekly Rate": 15000,
              "Monthly Rate": 50000,
              "GST Percentage": 18,
            },
          ];
          filename = "machine_import_template.xlsx";
          break;

        case "terms_conditions":
          templateData = [
            {
              Title: "Payment Terms",
              Description: "Payment should be made within 30 days",
              Category: "Payment",
              "Is Default": "YES",
              "Display Order": 1,
            },
          ];
          filename = "terms_import_template.xlsx";
          break;

        default:
          throw new Error("Invalid template type");
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Create main template sheet
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const colWidths = service.calculateColumnWidths(templateData);
      worksheet["!cols"] = colWidths;
      service.styleHeaders(worksheet, Object.keys(templateData[0]));
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

      // Create instructions sheet
      const instructions = [
        { Instruction: "Fill in your data starting from row 2" },
        { Instruction: "Do not modify the header row" },
        { Instruction: "Ensure all required fields are filled" },
        { Instruction: "Save the file and upload for import" },
      ];
      const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

      // Generate file path
      const filePath = path.join(service.outputDir, filename);

      // Write file
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath,
        filename,
        templateType,
        message: "Import template created successfully",
      };
    } catch (error) {
      console.error("Error creating import template:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to create import template",
      };
    }
  }

  // Generate Excel file with multiple sheets and charts
  static async generateAdvancedReport(reportData, options = {}) {
    try {
      const service = new ExcelService();

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Executive Summary Sheet
      const executiveSummary = [
        { "Report Type": "Business Analytics Report" },
        { "Generated Date": new Date().toLocaleDateString("en-IN") },
        { "Report Period": options.period || "All Time" },
        { "Total Records": reportData.totalRecords || 0 },
        { "Generated By": options.generatedBy || "System" },
      ];

      const summarySheet = XLSX.utils.json_to_sheet(executiveSummary);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary");

      // Add data sheets
      if (reportData.sheets) {
        reportData.sheets.forEach((sheet) => {
          if (sheet.data && sheet.data.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(sheet.data);
            const colWidths = service.calculateColumnWidths(sheet.data);
            worksheet["!cols"] = colWidths;
            service.styleHeaders(worksheet, Object.keys(sheet.data[0]));
            XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
          }
        });
      }

      // Generate filename
      const filename =
        options.filename || `advanced_report_${service.getDateString()}.xlsx`;
      const filePath = path.join(service.outputDir, filename);

      // Write file
      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filePath,
        filename,
        message: "Advanced report generated successfully",
      };
    } catch (error) {
      console.error("Error generating advanced report:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to generate advanced report",
      };
    }
  }

  // Delete specific Excel file
  static async deleteExcelFile(filename) {
    try {
      const service = new ExcelService();
      const filePath = path.join(service.outputDir, filename);

      await fs.unlink(filePath);
      return { success: true, message: "Excel file deleted successfully" };
    } catch (error) {
      console.error("Error deleting Excel file:", error);
      return { success: false, error: error.message };
    }
  }

  // Get list of generated Excel files
  static async listExcelFiles() {
    try {
      const service = new ExcelService();
      const files = await fs.readdir(service.outputDir);

      const excelFiles = [];

      for (const file of files) {
        if (file.endsWith(".xlsx") || file.endsWith(".xls")) {
          const filePath = path.join(service.outputDir, file);
          const stats = await fs.stat(filePath);

          excelFiles.push({
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            path: filePath,
          });
        }
      }

      // Sort by creation date (newest first)
      excelFiles.sort((a, b) => new Date(b.created) - new Date(a.created));

      return {
        success: true,
        files: excelFiles,
        count: excelFiles.length,
      };
    } catch (error) {
      console.error("Error listing Excel files:", error);
      return {
        success: false,
        error: error.message,
        files: [],
        count: 0,
      };
    }
  }
}

module.exports = ExcelService;
