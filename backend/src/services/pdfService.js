const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

class PDFService {
  constructor() {
    // Use system temp directory instead of project directory
    this.tempDir = os.tmpdir();
  }

  // Generate quotation PDF with immediate cleanup
  static async generateQuotationPDF(quotationData, options = {}) {
    let tempFilePath = null;
    try {
      const service = new PDFService();

      // Prepare template data
      const templateData = service.prepareQuotationData(quotationData);

      // Get HTML template
      const htmlContent = await service.generateQuotationHTML(templateData);

      // Generate unique filename
      const filename = `quotation_${
        quotationData.quotation_number
      }_${Date.now()}.pdf`;
      tempFilePath = path.join(service.tempDir, filename);

      // Generate PDF from HTML
      await service.generatePDFFromHTML(htmlContent, tempFilePath, options);

      // Return file buffer for immediate use
      const pdfBuffer = await fs.readFile(tempFilePath);

      return {
        success: true,
        buffer: pdfBuffer,
        filename: `quotation_${quotationData.quotation_number}.pdf`,
        message: "PDF generated successfully",
        cleanup: async () => {
          try {
            await fs.unlink(tempFilePath);
          } catch (error) {
            console.warn("Could not cleanup temp PDF:", error.message);
          }
        },
      };
    } catch (error) {
      console.error("Error generating quotation PDF:", error);

      // Cleanup on error
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }

      return {
        success: false,
        error: error.message,
        message: "Failed to generate PDF",
      };
    }
  }

  // Prepare quotation data for template
  prepareQuotationData(quotationData) {
    const currentDate = new Date().toLocaleDateString("en-IN");

    console.log("📊 PDF Data Preparation Debug:");
    console.log("Quotation Header:", {
      id: quotationData.id,
      quotation_number: quotationData.quotation_number,
      subtotal: quotationData.subtotal,
      total_gst_amount: quotationData.total_gst_amount,
      grand_total: quotationData.grand_total,
    });
    console.log("Quotation Items:", quotationData.items?.length || 0, "items");

    // Process terms and conditions
    let termsAndConditions = [];
    if (quotationData.terms_conditions) {
      const termsConfig =
        typeof quotationData.terms_conditions === "string"
          ? JSON.parse(quotationData.terms_conditions)
          : quotationData.terms_conditions;

      // Add default terms
      if (
        termsConfig.default_terms &&
        Array.isArray(termsConfig.default_terms)
      ) {
        termsAndConditions.push(
          ...termsConfig.default_terms.map(
            (term) => term.description || term.title
          )
        );
      }

      // Add custom terms
      if (termsConfig.custom_terms && Array.isArray(termsConfig.custom_terms)) {
        termsAndConditions.push(...termsConfig.custom_terms);
      }
    }

    // Process quotation items for display
    const processedItems = (quotationData.items || []).map((item, index) => ({
      serial_number: index + 1,
      type: item.item_type,
      machine_number: item.machine_number || "",
      machine_name: item.machine_name || "",
      description: item.description,
      duration_type: item.duration_type || "",
      quantity: parseFloat(item.quantity) || 1,
      unit_price: parseFloat(item.unit_price) || 0,
      gst_percentage: parseFloat(item.gst_percentage) || 0,
      gst_amount: parseFloat(item.gst_amount) || 0,
      total_amount: parseFloat(item.total_amount) || 0,
      is_machine: item.item_type === "machine",
      is_additional_charge: item.item_type === "additional_charge",
    }));

    // Use stored totals from database
    const subtotal = parseFloat(quotationData.subtotal) || 0;
    const totalGstAmount = parseFloat(quotationData.total_gst_amount) || 0;
    const grandTotal = parseFloat(quotationData.grand_total) || 0;

    console.log("📊 Final Totals:", { subtotal, totalGstAmount, grandTotal });

    return {
      // Company details (our company)
      company: {
        name:
          quotationData.our_company_name ||
          "M/S O.C.Shah Concrete Mixer Rental",
        gst: quotationData.our_gst_number || "24XXXXX1234X1ZX",
        email: quotationData.our_email || "ocs.group.service@gmail.com",
        phone: quotationData.our_phone || "+91-9876543210",
        address: quotationData.our_address || "Surat, Gujarat, India",
        logo: quotationData.logo_url || null,
        signature: quotationData.signature_url || null,
      },

      // Quotation details
      quotation: {
        number: quotationData.quotation_number,
        date: currentDate,
        validUntil: this.addDays(new Date(), 30).toLocaleDateString("en-IN"),
        status: quotationData.quotation_status || "draft",
        delivery_status: quotationData.delivery_status || "pending",
      },

      // Customer details
      customer: {
        name: quotationData.customer_name,
        contact: quotationData.customer_contact,
        company_name:
          quotationData.customer_company_name ||
          quotationData.company_name ||
          "",
        contact_person: quotationData.customer_contact_person || "",
        email: quotationData.customer_email || "",
        address: quotationData.customer_address || "",
        gst_number: quotationData.customer_gst_number || "",
      },

      // Items array (machines + additional charges)
      items: processedItems,

      // Pricing summary (use database values)
      pricing: {
        subtotal: subtotal,
        totalGstAmount: totalGstAmount,
        grandTotal: grandTotal,
        amountInWords: this.numberToWords(Math.round(grandTotal)),
      },

      // Additional information
      additional_notes: quotationData.additional_notes || "",
      termsConditions: termsAndConditions,
    };
  }

  // UPDATED HTML template for PDFService - Replace generateQuotationHTML method

  async generateQuotationHTML(data) {
    const handlebars = require("handlebars");

    // Clear any existing helpers first
    handlebars.unregisterHelper("formatCurrency");
    handlebars.unregisterHelper("formatDate");

    // Register helper functions
    handlebars.registerHelper("formatCurrency", function (amount) {
      const numAmount = parseFloat(amount) || 0;
      return `₹${numAmount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    });

    handlebars.registerHelper("formatDate", function (date) {
      return new Date(date).toLocaleDateString("en-IN");
    });

    // Add conditional helpers
    handlebars.registerHelper("eq", function (a, b) {
      return a === b;
    });

    const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation {{quotation.number}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.4; 
            font-size: 12px;
            color: #333;
        }
        
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 3px solid #FFC93C;
            padding-bottom: 20px;
        }
        
        .company-info h1 {
            color: #2C5530;
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .company-info p {
            margin-bottom: 5px;
            font-size: 11px;
        }
        
        .quotation-title {
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            color: #2C5530;
            margin: 20px 0;
            text-transform: uppercase;
        }
        
        .details-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        
        .details-box {
            flex: 1;
            margin-right: 20px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
        }
        
        .details-box:last-child { margin-right: 0; }
        
        .details-box h3 {
            color: #2C5530;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 11px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        .items-table th {
            background-color: #FFC93C;
            font-weight: bold;
            color: #2C5530;
        }
        
        .items-table .amount {
            text-align: right;
        }
        
        .total-section {
            float: right;
            width: 300px;
            margin-top: 20px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            font-size: 12px;
        }
        
        .grand-total {
            font-weight: bold;
            font-size: 14px;
            color: #2C5530;
            border-top: 2px solid #FFC93C;
        }
        
        .terms-section {
            margin-top: 30px;
        }
        
        .terms-section h3 {
            color: #2C5530;
            margin-bottom: 15px;
        }
        
        .terms-list {
            list-style-type: decimal;
            margin-left: 20px;
        }
        
        .terms-list li {
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                <h1>{{company.name}}</h1>
                <p><strong>GST No:</strong> {{company.gst}}</p>
                <p><strong>Email:</strong> {{company.email}}</p>
                <p><strong>Phone:</strong> {{company.phone}}</p>
                <p><strong>Address:</strong> {{company.address}}</p>
            </div>
        </div>

        <!-- Quotation Title -->
        <div class="quotation-title">
            QUOTATION - {{quotation.number}}
        </div>

        <!-- Customer Details -->
        <div class="details-section">
            <div class="details-box">
                <h3>Quotation To</h3>
                <p><strong>{{customer.name}}</strong></p>
                {{#if customer.company_name}}
                <p>Company: {{customer.company_name}}</p>
                {{/if}}
                <p>Phone: {{customer.contact}}</p>
                {{#if customer.email}}
                <p>Email: {{customer.email}}</p>
                {{/if}}
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Description</th>
                    <th>Duration</th>
                    <th>Qty</th>
                    <th class="amount">Unit Price</th>
                    <th class="amount">GST %</th>
                    <th class="amount">Total</th>
                </tr>
            </thead>
            <tbody>
                {{#each items}}
                <tr>
                    <td>{{serial_number}}</td>
                    <td>
                        {{#if is_machine}}
                        <strong>{{machine_name}}</strong><br>
                        <small>{{description}}</small>
                        {{else}}
                        <strong>{{description}}</strong>
                        {{/if}}
                    </td>
                    <td>{{duration_type}}</td>
                    <td>{{quantity}}</td>
                    <td class="amount">{{formatCurrency unit_price}}</td>
                    <td class="amount">{{gst_percentage}}%</td>
                    <td class="amount">{{formatCurrency total_amount}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>

        <!-- Total Section -->
        <div class="total-section">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>{{formatCurrency pricing.subtotal}}</span>
            </div>
            <div class="total-row">
                <span>Total GST:</span>
                <span>{{formatCurrency pricing.totalGstAmount}}</span>
            </div>
            <div class="total-row grand-total">
                <span>Grand Total:</span>
                <span>{{formatCurrency pricing.grandTotal}}</span>
            </div>
        </div>

        <!-- Amount in Words -->
        <div style="clear: both; margin-top: 40px; font-weight: bold;">
            <strong>Amount in Words:</strong> {{pricing.amountInWords}} Only
        </div>

        <!-- Terms and Conditions -->
        {{#if termsConditions}}
        <div class="terms-section">
            <h3>Terms and Conditions</h3>
            <ol class="terms-list">
                {{#each termsConditions}}
                <li>{{this}}</li>
                {{/each}}
            </ol>
        </div>
        {{/if}}

        <!-- Additional Notes -->
        {{#if additional_notes}}
        <div style="margin-top: 30px; padding: 15px; background: #f0f8f0; border-left: 4px solid #FFC93C;">
            <h4>Additional Notes:</h4>
            <p>{{additional_notes}}</p>
        </div>
        {{/if}}

        <!-- Signature -->
        <div style="margin-top: 50px; text-align: right;">
            <p><strong>For any inquiries, contact:</strong></p>
            <p>Phone: {{company.phone}}</p>
            <p>Email: {{company.email}}</p>
            <br>
            <p><strong>Authorized Signature</strong></p>
            <p>{{company.name}}</p>
        </div>
    </div>
</body>
</html>`;

    try {
      const compiledTemplate = handlebars.compile(template);
      return compiledTemplate(data);
    } catch (error) {
      console.error("Error compiling Handlebars template:", error);
      throw error;
    }
  }

  // Generate PDF from HTML content (saves to temp path)
  async generatePDFFromHTML(htmlContent, tempFilePath, options = {}) {
    let browser;
    try {
      // Launch Puppeteer
      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Set content
      await page.setContent(htmlContent, {
        waitUntil: "domcontentloaded",
      });

      // Generate PDF to temp path
      await page.pdf({
        path: tempFilePath,
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          bottom: "20px",
          left: "20px",
          right: "20px",
        },
        ...options,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Generate service report PDF with immediate cleanup
  static async generateServiceReportPDF(serviceData, options = {}) {
    let tempFilePath = null;
    try {
      const service = new PDFService();

      // Prepare template data for service report
      const templateData = service.prepareServiceReportData(serviceData);

      // Get HTML template for service report
      const htmlContent = await service.generateServiceReportHTML(templateData);

      // Generate unique filename
      const filename = `service_report_${Date.now()}.pdf`;
      tempFilePath = path.join(service.tempDir, filename);

      // Generate PDF
      await service.generatePDFFromHTML(htmlContent, tempFilePath, options);

      // Return file buffer
      const pdfBuffer = await fs.readFile(tempFilePath);

      return {
        success: true,
        buffer: pdfBuffer,
        filename: `service_report_${Date.now()}.pdf`,
        message: "Service report PDF generated successfully",
        cleanup: async () => {
          try {
            await fs.unlink(tempFilePath);
          } catch (error) {
            console.warn("Could not cleanup temp PDF:", error.message);
          }
        },
      };
    } catch (error) {
      console.error("Error generating service report PDF:", error);

      // Cleanup on error
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }

      return {
        success: false,
        error: error.message,
        message: "Failed to generate service report PDF",
      };
    }
  }

  // Prepare service report data
  prepareServiceReportData(serviceData) {
    return {
      title: "Service Report",
      generatedDate: new Date().toLocaleDateString("en-IN"),
      period: serviceData.period || "All Time",
      services: serviceData.services || [],
      summary: serviceData.summary || {},
      company: {
        name: "M/S O.C.Shah Concrete Mixer Rental",
        address: "Surat, Gujarat, India",
      },
    };
  }

  // Generate service report HTML
  async generateServiceReportHTML(data) {
    const template = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Service Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #0081C9; padding-bottom: 20px; }
        .content { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { background: #f8f9fa; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        <h3>{{company.name}}</h3>
        <p>Generated: {{generatedDate}} | Period: {{period}}</p>
    </div>
    
    <div class="summary">
        <h3>Summary</h3>
        <p>Total Services: {{summary.totalServices}}</p>
        <p>Machines Serviced: {{summary.machinesServiced}}</p>
    </div>
    
    <div class="content">
        <h3>Service Records</h3>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Machine</th>
                    <th>Services</th>
                    <th>Operator</th>
                </tr>
            </thead>
            <tbody>
                {{#each services}}
                <tr>
                    <td>{{this.service_date}}</td>
                    <td>{{this.machine_number}}</td>
                    <td>{{this.services_performed}}</td>
                    <td>{{this.operator}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
    </div>
</body>
</html>`;

    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
  }

  // Generate custom PDF from HTML string with immediate cleanup
  static async generateCustomPDF(htmlContent, filename, options = {}) {
    let tempFilePath = null;
    try {
      const service = new PDFService();

      // Generate unique temp filename
      const tempFilename = `custom_${Date.now()}_${filename}`;
      tempFilePath = path.join(service.tempDir, tempFilename);

      await service.generatePDFFromHTML(htmlContent, tempFilePath, options);

      // Return file buffer
      const pdfBuffer = await fs.readFile(tempFilePath);

      return {
        success: true,
        buffer: pdfBuffer,
        filename: filename,
        message: "Custom PDF generated successfully",
        cleanup: async () => {
          try {
            await fs.unlink(tempFilePath);
          } catch (error) {
            console.warn("Could not cleanup temp PDF:", error.message);
          }
        },
      };
    } catch (error) {
      console.error("Error generating custom PDF:", error);

      // Cleanup on error
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }

      return {
        success: false,
        error: error.message,
        message: "Failed to generate custom PDF",
      };
    }
  }

  // Utility: Add days to date
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  // Utility: Convert number to words (Indian format)
  numberToWords(amount) {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    if (amount === 0) return "Zero";

    const crores = Math.floor(amount / 10000000);
    const lakhs = Math.floor((amount % 10000000) / 100000);
    const thousands = Math.floor((amount % 100000) / 1000);
    const hundreds = Math.floor((amount % 1000) / 100);
    const remainder = amount % 100;

    let words = "";

    if (crores > 0) {
      words += this.convertTwoDigit(crores) + " Crore ";
    }

    if (lakhs > 0) {
      words += this.convertTwoDigit(lakhs) + " Lakh ";
    }

    if (thousands > 0) {
      words += this.convertTwoDigit(thousands) + " Thousand ";
    }

    if (hundreds > 0) {
      words += ones[hundreds] + " Hundred ";
    }

    if (remainder > 0) {
      words += this.convertTwoDigit(remainder);
    }

    return words.trim() + " Rupees";
  }

  // Helper for number conversion
  convertTwoDigit(number) {
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
    ];
    const teens = [
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    if (number < 10) {
      return ones[number];
    } else if (number < 20) {
      return teens[number - 10];
    } else {
      const tensDigit = Math.floor(number / 10);
      const onesDigit = number % 10;
      return tens[tensDigit] + (onesDigit > 0 ? " " + ones[onesDigit] : "");
    }
  }

  // Clean up all temporary PDFs in system temp directory (optional utility)
  static async cleanupAllTempPDFs() {
    try {
      const service = new PDFService();
      const files = await fs.readdir(service.tempDir);
      let deletedCount = 0;

      for (const file of files) {
        if (
          file.endsWith(".pdf") &&
          (file.startsWith("quotation_") ||
            file.startsWith("service_report_") ||
            file.startsWith("custom_"))
        ) {
          try {
            const filePath = path.join(service.tempDir, file);
            await fs.unlink(filePath);
            deletedCount++;
          } catch (error) {
            // Continue with other files if one fails
          }
        }
      }

      console.log(`Cleaned up ${deletedCount} temporary PDF files`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error("Error cleaning up temporary PDFs:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PDFService;
