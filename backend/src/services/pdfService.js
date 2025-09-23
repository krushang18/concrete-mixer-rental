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

  // Updated generateQuotationHTML method for your existing PDFService class
  // Replace the existing generateQuotationHTML method with this updated version

  // Fixed methods for your PDFService class
  // Replace these methods in your existing pdfService.js file

  // Updated method to fetch company details and merge with quotation data
  static async getQuotationDataWithCompanyDetails(quotationId) {
    const { executeQuery } = require("../config/database");

    try {
      // Fetch quotation with all related data
      const quotationQuery = `
      SELECT 
        q.*,
        u.username as created_by_user,
        ocd.company_name as our_company_name,
        ocd.gst_number as our_gst_number,
        ocd.email as our_email,
        ocd.phone as our_phone,
        ocd.address as our_address,
        ocd.logo_url,
        ocd.signature_url,
        c.company_name as customer_company_name,
        c.contact_person as customer_contact_person,
        c.email as customer_email,
        c.address as customer_address,
        c.gst_number as customer_gst_number,
        c.site_location as customer_site_location
      FROM quotations q
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN our_company_details ocd ON 1=1
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.id = ?
      ORDER BY ocd.id DESC
      LIMIT 1
    `;

      // Fetch quotation items
      const itemsQuery = `
      SELECT 
        qi.*,
        m.name as machine_name,
        m.description as machine_description
      FROM quotation_items qi
      LEFT JOIN machines m ON qi.machine_id = m.id
      WHERE qi.quotation_id = ?
      ORDER BY qi.sort_order, qi.id
    `;

      const quotationResult = await executeQuery(quotationQuery, [quotationId]);
      const itemsResult = await executeQuery(itemsQuery, [quotationId]);

      if (!quotationResult || quotationResult.length === 0) {
        throw new Error("Quotation not found");
      }

      const quotation = quotationResult[0];
      quotation.items = itemsResult || [];

      return quotation;
    } catch (error) {
      console.error("Error fetching quotation with company details:", error);
      throw error;
    }
  }

  // Updated main PDF generation method
  static async generateQuotationPDF(quotationData, options = {}) {
    let tempFilePath = null;
    try {
      const service = new PDFService();

      // Enhance quotation data with company details
      const enhancedQuotationData =
        await PDFService.enhanceQuotationDataWithCompanyDetails(quotationData);

      // Prepare template data
      const templateData = service.prepareQuotationData(enhancedQuotationData);

      // Get HTML template
      const htmlContent = await service.generateQuotationHTML(templateData);

      // Generate unique filename
      const filename = `quotation_${
        enhancedQuotationData.quotation_number
      }_${Date.now()}.pdf`;
      tempFilePath = path.join(service.tempDir, filename);

      // Generate PDF from HTML
      await service.generatePDFFromHTML(htmlContent, tempFilePath, options);

      // Return file buffer for immediate use
      const pdfBuffer = await fs.readFile(tempFilePath);

      return {
        success: true,
        buffer: pdfBuffer,
        filename: `quotation_${enhancedQuotationData.quotation_number}.pdf`,
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

  // Fixed convertImageToBase64 method with proper signature file detection
  static async convertImageToBase64(imagePath) {
    const fs = require("fs").promises;
    const path = require("path");

    try {
      console.log("🖼️ Converting image to base64:", imagePath);

      if (!imagePath) {
        console.log("❌ No image path provided");
        return null;
      }

      // Determine if this is a logo or signature request
      const isSignature = imagePath.includes("signature");
      const isLogo = imagePath.includes("logo");

      console.log(
        "🔍 Image type detected:",
        isLogo ? "Logo" : isSignature ? "Signature" : "Unknown"
      );

      // Handle different path scenarios
      let fullPath;
      const cleanPath = imagePath.startsWith("/")
        ? imagePath.slice(1)
        : imagePath;
      fullPath = path.join(process.cwd(), cleanPath);

      console.log("🔍 Full path to check:", fullPath);

      // Check if file exists
      try {
        await fs.access(fullPath);
        console.log("✅ File exists at:", fullPath);
      } catch (error) {
        console.error("❌ File not found at:", fullPath);

        // Create specific alternative paths based on image type
        let alternativePaths = [];

        if (isLogo) {
          alternativePaths = [
            path.join(process.cwd(), "uploads", "company", "logo.png"),
            path.join(process.cwd(), "uploads", "company", "logo.jpg"),
            path.join(process.cwd(), "uploads", "company", "logo.jpeg"),
            path.join(
              process.cwd(),
              "public",
              "uploads",
              "company",
              "logo.png"
            ),
            path.join(__dirname, "..", "..", "uploads", "company", "logo.png"),
          ];
        } else if (isSignature) {
          alternativePaths = [
            path.join(process.cwd(), "uploads", "company", "signature.png"),
            path.join(process.cwd(), "uploads", "company", "signature.jpg"),
            path.join(process.cwd(), "uploads", "company", "signature.jpeg"),
            path.join(
              process.cwd(),
              "public",
              "uploads",
              "company",
              "signature.png"
            ),
            path.join(
              __dirname,
              "..",
              "..",
              "uploads",
              "company",
              "signature.png"
            ),
          ];
        } else {
          // Generic fallback
          alternativePaths = [
            path.join(
              process.cwd(),
              "uploads",
              "company",
              path.basename(cleanPath)
            ),
            path.join(process.cwd(), "public", cleanPath),
            path.join(__dirname, "..", "..", cleanPath),
          ];
        }

        console.log(
          "🔄 Trying alternative paths for",
          isLogo ? "logo" : isSignature ? "signature" : "image",
          "..."
        );

        let found = false;
        for (const altPath of alternativePaths) {
          try {
            await fs.access(altPath);
            fullPath = altPath;
            console.log("✅ Found file at alternative path:", altPath);
            found = true;
            break;
          } catch (altError) {
            console.log("❌ Not found at:", altPath);
          }
        }

        if (!found) {
          console.error(
            "❌ Image file not found in any location for:",
            imagePath
          );
          return null;
        }
      }

      // Get file stats
      const stats = await fs.stat(fullPath);
      console.log("📊 File size:", stats.size, "bytes");

      // Read file and convert to base64
      const imageBuffer = await fs.readFile(fullPath);
      const fileExtension = path.extname(fullPath).toLowerCase();

      // Determine MIME type
      let mimeType;
      switch (fileExtension) {
        case ".png":
          mimeType = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          mimeType = "image/jpeg";
          break;
        case ".gif":
          mimeType = "image/gif";
          break;
        default:
          mimeType = "image/png";
      }

      const base64String = imageBuffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64String}`;

      console.log(
        "✅",
        isLogo ? "Logo" : isSignature ? "Signature" : "Image",
        "converted successfully"
      );
      console.log("📏 Base64 length:", base64String.length);
      console.log("🎯 MIME type:", mimeType);
      console.log("📁 Final file used:", fullPath);

      return dataUrl;
    } catch (error) {
      console.error("❌ Error converting image to base64:", error);
      return null;
    }
  }

  // Updated enhanceQuotationDataWithCompanyDetails method to include phone2
  static async enhanceQuotationDataWithCompanyDetails(quotationData) {
    const { executeQuery } = require("../config/database");

    try {
      // Fetch company details - include phone2
      const companyQuery = `
      SELECT 
        company_name as our_company_name,
        gst_number as our_gst_number,
        email as our_email,
        phone as our_phone,
        phone2 as our_phone2,
        address as our_address,
        logo_url,
        signature_url
      FROM our_company_details 
      ORDER BY id DESC 
      LIMIT 1
    `;

      const companyResult = await executeQuery(companyQuery);

      // Fetch customer details if customer_id exists
      let customerData = {};
      if (quotationData.customer_id) {
        const customerQuery = `
        SELECT 
          company_name as customer_company_name,
          contact_person as customer_contact_person,
          email as customer_email,
          address as customer_address,
          gst_number as customer_gst_number,
          site_location as customer_site_location
        FROM customers 
        WHERE id = ?
      `;

        const customerResult = await executeQuery(customerQuery, [
          quotationData.customer_id,
        ]);
        if (customerResult && customerResult.length > 0) {
          customerData = customerResult[0];
        }
      }

      // Process company data and convert images to base64
      let enhancedCompanyData = {};
      if (companyResult && companyResult.length > 0) {
        enhancedCompanyData = companyResult[0];

        // Convert logo to base64 if it exists
        if (enhancedCompanyData.logo_url) {
          console.log(
            "Converting logo to base64:",
            enhancedCompanyData.logo_url
          );
          enhancedCompanyData.logo_base64 =
            await PDFService.convertImageToBase64(enhancedCompanyData.logo_url);
          if (enhancedCompanyData.logo_base64) {
            console.log("Logo converted successfully");
          }
        }

        // Convert signature to base64 if it exists
        if (enhancedCompanyData.signature_url) {
          console.log(
            "Converting signature to base64:",
            enhancedCompanyData.signature_url
          );
          enhancedCompanyData.signature_base64 =
            await PDFService.convertImageToBase64(
              enhancedCompanyData.signature_url
            );
          if (enhancedCompanyData.signature_base64) {
            console.log("Signature converted successfully");
          }
        }
      }

      // Merge company and customer data with existing quotation data
      const enhancedData = {
        ...quotationData,
        ...enhancedCompanyData,
        ...customerData,
      };

      console.log(
        "Enhanced quotation data with company details and base64 images"
      );
      return enhancedData;
    } catch (error) {
      console.error("Error enhancing quotation data:", error);
      // Return original data if enhancement fails
      return quotationData;
    }
  }

  // Updated prepareQuotationData method to handle both phone numbers
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
    console.log("Logo base64 available:", !!quotationData.logo_base64);
    console.log(
      "Signature base64 available:",
      !!quotationData.signature_base64
    );
    console.log("Quotation Items:", quotationData.items?.length || 0, "items");

    // Process terms and conditions
    let termsAndConditions = [];
    if (quotationData.terms_conditions) {
      try {
        const termsConfig =
          typeof quotationData.terms_conditions === "string"
            ? JSON.parse(quotationData.terms_conditions)
            : quotationData.terms_conditions;

        // Add default terms (if they exist from controller)
        if (
          termsConfig.default_terms &&
          Array.isArray(termsConfig.default_terms)
        ) {
          termsAndConditions.push(
            ...termsConfig.default_terms.map(
              (term) => term.description || term.title || term
            )
          );
        }

        // Add custom terms
        if (
          termsConfig.custom_terms &&
          Array.isArray(termsConfig.custom_terms)
        ) {
          termsAndConditions.push(...termsConfig.custom_terms);
        }
      } catch (error) {
        console.error("Error parsing terms and conditions:", error);
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

    // Format phone numbers - combine both if available
    const formatPhoneNumbers = () => {
      const phone1 = quotationData.our_phone;
      const phone2 = quotationData.our_phone2;

      if (phone1 && phone2) {
        return `${phone1} OR ${phone2}`;
      }
      return phone1 || phone2 || "+91-9913737777";
    };

    return {
      // Company details (our company) - use from database or fallback
      company: {
        name:
          quotationData.our_company_name ||
          "M/S O.C.Shah Concrete Mixer Rental",
        gst: quotationData.our_gst_number || "24AAAFO2654G1ZK",
        email: quotationData.our_email || "ocs.group.service@gmail.com",
        phone: formatPhoneNumbers(), // Now includes both numbers
        address:
          quotationData.our_address ||
          "E-706, Radhe infinity, Raksha Shakti Circle Kudasan, Gandhinagar, Gujarat - 382426",
        logo: quotationData.logo_base64 || null, // Use base64 data URL
        signature: quotationData.signature_base64 || null, // Use base64 data URL
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
        contact_person:
          quotationData.customer_contact_person ||
          quotationData.contact_person ||
          "",
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

  // Updated HTML template with wider company boxes and better phone display
  // Updated HTML template with fixed widths and footer positioning
  // Template with OBVIOUS visual changes to confirm updates are working
  // Final proper generateQuotationHTML method
  async generateQuotationHTML(data) {
    const handlebars = require("handlebars");

    // Clear any existing helpers first
    handlebars.unregisterHelper("formatCurrency");
    handlebars.unregisterHelper("formatDate");
    handlebars.unregisterHelper("eq");

    // Register helper functions
    handlebars.registerHelper("formatCurrency", function (amount) {
      const numAmount = parseFloat(amount) || 0;
      return numAmount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    });

    handlebars.registerHelper("formatDate", function (date) {
      if (!date) return new Date().toLocaleDateString("en-IN");
      return new Date(date).toLocaleDateString("en-IN");
    });

    handlebars.registerHelper("eq", function (a, b) {
      return a === b;
    });

    // Final template with proper styling and layout
    const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quotation - {{quotation.number}}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
        }
        .quotation-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 15px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0081C9;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .logo {
            max-height: 100px;
            max-width: 220px;
        }
        .quotation-title {
            color: #0081C9;
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            text-align: right;
        }
        .quotation-details {
            text-align: right;
            font-size: 12px;
            margin-top: 5px;
        }
        .company-section {
            width: 100%;
            margin-bottom: 20px;
        }
        .company-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
        }
        .company-box {
            width: 40%;
            background-color: #F8F9FA;
            padding: 15px;
            border-left: 4px solid #0081C9;
            min-height: 180px;
            box-sizing: border-box;
        }
        .company-box h3 {
            color: #0081C9;
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: bold;
        }
        .company-box p {
            margin: 6px 0;
            font-size: 12px;
            line-height: 1.5;
        }
        .items-section {
            margin-bottom: 25px;
        }
        .section-title {
            background-color: #FFC93C;
            color: #333;
            text-align: center;
            padding: 10px;
            margin-bottom: 0;
            font-weight: bold;
            font-size: 14px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
        }
        .items-table th {
            background-color: #0081C9;
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
        }
        .items-table td {
            border: 1px solid #ddd;
            padding: 8px;
            vertical-align: top;
        }
        .items-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .items-table .item-name {
            font-weight: bold;
        }
        .items-table .item-description {
            color: #666;
            font-size: 11px;
            margin-top: 2px;
        }
        .totals {
            text-align: right;
            margin-bottom: 25px;
            padding-right: 10px;
        }
        .subtotal, .gst {
            font-size: 12px;
            margin-bottom: 5px;
        }
        .grand-total {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 8px;
            color: #0081C9;
        }
        .amount-words {
            font-size: 11px;
            color: #666;
            font-style: italic;
        }
        .terms-section {
            background-color: #F8F9FA;
            padding: 15px;
            border-left: 4px solid #0081C9;
            margin-bottom: 25px;
            font-size: 12px;
        }
        .terms-section h3 {
            color: #0081C9;
            margin-top: 0;
            margin-bottom: 12px;
            font-size: 14px;
            font-weight: bold;
        }
        .terms-section ol {
            margin: 0;
            padding-left: 20px;
        }
        .terms-section li {
            margin-bottom: 6px;
            line-height: 1.4;
        }
        .notes {
            font-size: 12px;
            border: 1px dashed #ccc;
            padding: 12px;
            margin-bottom: 25px;
            background-color: #fffdf0;
        }
        .footer-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            min-height: 80px;
        }
        .contact-info {
            width: 55%;
            font-size: 12px;
            color: #666;
        }
        .contact-info p {
            margin: 2px 0;
        }
        .signature-section {
            width: 40%;
            text-align: right;
        }
        .signature-section img {
            max-height: 60px;
            margin-bottom: 8px;
        }
        .signature-section .signature-title {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .signature-section .company-name {
            font-size: 11px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="quotation-container">
        <!-- Header -->
        <div class="header">
            <div>
                {{#if company.logo}}
                <img src="{{company.logo}}" alt="Company Logo" class="logo">
                {{else}}
                <h2 style="color: #0081C9; margin: 0;">{{company.name}}</h2>
                {{/if}}
            </div>
            <div>
                <h1 class="quotation-title">QUOTATION</h1>
                <div class="quotation-details">
                    <p>
                        <strong>Quotation Number:</strong> {{quotation.number}}<br>
                        <strong>Date:</strong> {{quotation.date}}<br>
                        <strong>Valid Until:</strong> {{quotation.validUntil}}
                    </p>
                </div>
            </div>
        </div>

        <!-- Company Details with 40% width each -->
        <div class="company-section">
            <div class="company-row">
                <div class="company-box">
                    <h3>Quotation By</h3>
                    <p>
                        <strong>{{company.name}}</strong><br>
                        {{#if company.gst}}GST No: {{company.gst}}<br>{{/if}}
                        Email: {{company.email}}<br>
                        Phone: {{company.phone}}<br>
                        Address: {{company.address}}
                    </p>
                </div>
                
                <div class="company-box">
                    <h3>Quotation To</h3>
                    <p>
                        <strong>{{#if customer.company_name}}{{customer.company_name}}{{else}}{{customer.name}}{{/if}}</strong><br>
                        {{#if customer.contact_person}}Contact: {{customer.contact_person}}<br>{{/if}}
                        {{#if customer.email}}Email: {{customer.email}}<br>{{/if}}
                        Phone: {{customer.contact}}<br>
                        {{#if customer.address}}Address: {{customer.address}}<br>{{/if}}
                        {{#if customer.gst_number}}GST No: {{customer.gst_number}}{{else}}GST No: N/A{{/if}}
                    </p>
                </div>
            </div>
        </div>

        <!-- Quotation Items -->
        <div class="items-section">
            <div class="section-title">Quotation Items</div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 5%;">S.No</th>
                        <th style="width: 35%;">Machine/Description</th>
                        <th style="width: 15%;">Duration</th>
                        <th style="width: 8%;">Qty</th>
                        <th style="width: 12%;">Unit Price</th>
                        <th style="width: 10%;">GST %</th>
                        <th style="width: 15%;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each items}}
                    <tr>
                        <td style="text-align: center;">{{serial_number}}</td>
                        <td>
                            <div class="item-name">{{description}}</div>
                            {{#if machine_name}}<div class="item-description">{{machine_name}}</div>{{/if}}
                        </td>
                        <td>{{#if duration_type}}{{duration_type}}{{else}}One-time{{/if}}</td>
                        <td style="text-align: center;">{{quantity}}</td>
                        <td style="text-align: right;">₹{{formatCurrency unit_price}}</td>
                        <td style="text-align: center;">{{gst_percentage}}%</td>
                        <td style="text-align: right;">₹{{formatCurrency total_amount}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </div>

        <!-- Totals -->
        <div class="totals">
            <div class="subtotal">Subtotal: ₹{{formatCurrency pricing.subtotal}}</div>
            {{#if pricing.totalGstAmount}}
            <div class="gst">GST: ₹{{formatCurrency pricing.totalGstAmount}}</div>
            {{/if}}
            <div class="grand-total">Grand Total: ₹{{formatCurrency pricing.grandTotal}}</div>
            <div class="amount-words">{{pricing.amountInWords}}</div>
        </div>

        <!-- Notes if available -->
        {{#if additional_notes}}
        <div class="notes">
            <strong>Notes:</strong> {{additional_notes}}
        </div>
        {{/if}}

        <!-- Terms and Conditions -->
        {{#if termsConditions}}
        <div class="terms-section">
            <h3>Terms and Conditions</h3>
            <ol>
                {{#each termsConditions}}
                <li>{{this}}</li>
                {{/each}}
            </ol>
        </div>
        {{/if}}

        <!-- Footer with proper alignment -->
        <div class="footer-section">
            <div class="contact-info">
                <p><strong>For any inquiries, contact:</strong></p>
                <p>Phone: {{company.phone}}</p>
                <p>Email: {{company.email}}</p>
            </div>
            <div class="signature-section">
                {{#if company.signature}}
                <img src="{{company.signature}}" alt="Authorized Signature">
                {{/if}}
                <div class="signature-title">Authorized Signature</div>
                <div class="company-name">{{company.name}}</div>
            </div>
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
