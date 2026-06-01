import { jsPDF } from "jspdf";

export interface PDFDataArgs {
  candidateName: string;
  jobRole: string;
  companyName: string;
  experienceYears?: number;
  timestamp: any;
  result: {
    readinessScore: number;
    readinessLevel: string;
    executiveSummary: string;
    skillGaps: Array<{
      skill: string;
      priority: string;
      status: string;
      reason: string;
    }>;
    learningPath: Array<{
      step: string;
      title: string;
      estimatedTime: string;
      description: string;
      resourceName: string;
      resourceSuggestion: string;
    }>;
    alternativeRoles?: Array<{
      role: string;
      matchPercentage: number;
      matchReason: string;
    }>;
    alternativeCareerRoles?: Array<{
      role: string;
      matchPercentage: number;
      matchReason: string;
    }>;
  };
}

const getIconPng = async (id: string): Promise<string> => {
  if (typeof document === 'undefined') return '';
  const svgEl = document.getElementById(id) as unknown as SVGSVGElement | null;
  if (!svgEl) return '';
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const scale = 4;
    const width = 24;
    const height = 24;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve('');
    ctx.scale(scale, scale);
    
    if (!svgEl.getAttribute('xmlns')) {
      svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = 'data:image/svg+xml;base64,' + base64;
  });
};

const getFaviconPng = async (isDark: boolean): Promise<string> => {
  if (typeof window === 'undefined') return '';
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 4;
      canvas.width = 250 * scale;
      canvas.height = 250 * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = isDark ? '/favicon-dark.svg' : '/favicon.svg';
  });
};

export const generateResumePDF = async (profile: any): Promise<boolean> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // Detect Dark Mode
    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    const bgColor = isDarkMode ? [9, 9, 11] : [250, 250, 250]; 
    const textColor = isDarkMode ? [250, 250, 250] : [24, 24, 27];
    const secondaryTextColor = isDarkMode ? [161, 161, 170] : [82, 82, 91];

    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

    // Header
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(profile.fullName || "Candidate Resume", margin, yPos);
    
    yPos += 8;
    const subtitleParts = [];
    if (profile.category) subtitleParts.push(profile.category);
    if (profile.experienceYears !== undefined) subtitleParts.push(`${profile.experienceYears} Years Experience`);
    if (subtitleParts.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
      doc.text(subtitleParts.join(' • '), margin, yPos);
      yPos += 8;
    }

    doc.setDrawColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 15;

    if (profile.summary) {
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Professional Summary", margin, yPos);
      yPos += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
      const summaryLines = doc.splitTextToSize(profile.summary, pageWidth - margin * 2);
      doc.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * 5 + 10;
    }

    if (profile.skills && profile.skills.length > 0) {
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Skills", margin, yPos);
      yPos += 8;
      
      const skillsByLevel = { 'Advanced': [], 'Intermediate': [], 'Beginner': [] } as Record<string, any[]>;
      profile.skills.forEach((s: any) => {
          if (skillsByLevel[s.level]) {
              skillsByLevel[s.level].push(s);
          } else {
              skillsByLevel['Beginner'].push(s);
          }
      });
      
      ['Advanced', 'Intermediate', 'Beginner'].forEach((level) => {
         const catSkills = skillsByLevel[level];
         if (catSkills && catSkills.length > 0) {
             if (yPos > doc.internal.pageSize.getHeight() - 30) {
                 doc.addPage();
                 doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
                 doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
                 yPos = 20;
             }
             doc.setFont("helvetica", "bold");
             doc.setFontSize(11);
             doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
             doc.text(level, margin, yPos);
             yPos += 6;
             
             doc.setFont("helvetica", "normal");
             doc.setFontSize(10);
             doc.setTextColor(textColor[0], textColor[1], textColor[2]);
             
             // Two column layout for skills
             const colWidth = (pageWidth - margin * 2) / 2;
             catSkills.forEach((skill, idx) => {
                 const x = margin + (idx % 2) * colWidth;
                 let text = `• ${skill.name} (${skill.category})`;
                 doc.text(text, x, yPos);
                 if (idx % 2 === 1 || idx === catSkills.length - 1) {
                     yPos += 6;
                 }
                 if (yPos > doc.internal.pageSize.getHeight() - 20) {
                     doc.addPage();
                     doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
                     doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
                     yPos = 20;
                 }
             });
             yPos += 4;
         }
      });
    }

    const filename = `SkillBridge_Resume_${profile.fullName ? profile.fullName.replace(/\s+/g, "_") : "User"}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error("Failed to generate Resume PDF:", err);
    return false;
  }
};

export const generatePDFReport = async ({
  candidateName,
  jobRole,
  experienceYears,
  result
}: PDFDataArgs): Promise<boolean> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = 20;

    // Detect Dark Mode
    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    // Fetch Icons and Logo
    const brainIcon = await getIconPng('pdf-icon-brain');
    const alertIcon = await getIconPng('pdf-icon-alert');
    const bookIcon = await getIconPng('pdf-icon-book');
    const briefcaseIcon = await getIconPng('pdf-icon-briefcase');
    const faviconPng = await getFaviconPng(isDarkMode);
    const bgColor = isDarkMode ? [9, 9, 11] : [250, 250, 250]; // Slate-950 or Slate-50
    const textColor = isDarkMode ? [250, 250, 250] : [24, 24, 27]; // Slate-50 or Slate-900
    const secondaryTextColor = isDarkMode ? [161, 161, 170] : [82, 82, 91]; // Slate-400 or Slate-600
    const cardBgColor = isDarkMode ? [24, 24, 27] : [255, 255, 255]; // Slate-900 or White
    const cardBorderColor = isDarkMode ? [39, 39, 42] : [228, 228, 231]; // Slate-800 or Slate-200

    // Set Background
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // --- Helpers ---
    const checkSpace = (h: number) => {
      if (yPos + h > pageHeight - margin - 10) {
        doc.addPage();
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = 20;
        return true;
      }
      return false;
    };

    const drawCard = (x: number, y: number, w: number, h: number, bg: [number, number, number] = cardBgColor as [number, number, number]) => {
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.setDrawColor(cardBorderColor[0], cardBorderColor[1], cardBorderColor[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, w, h, 4, 4, 'FD');
    };

    // --- Icon Helpers (Refined for Lucide look) ---
    const drawLightbulbIcon = (x: number, y: number, size: number, color: [number, number, number]) => {
      doc.setFillColor(color[0], color[1], color[2]);
      const s = size / 24;
      // Bulb
      doc.circle(x + 12*s, y + 9*s, 6*s, 'F');
      // Base
      doc.rect(x + 9*s, y + 15*s, 6*s, 4*s, 'F');
      // Bottom contact
      doc.rect(x + 10*s, y + 20*s, 4*s, 2*s, 'F');
    };

    // --- Header ---
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    const iconSize = 12.7; // 48px
    const gap = 4.23; // 16px
    const textX = margin + iconSize + gap;

    if (faviconPng) {
      doc.addImage(faviconPng, 'PNG', margin, 18, iconSize, iconSize);
    }

    // Title
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22.5); // 30px (text-3xl)
    doc.text("SkillBridge", textX, 26);

    // Subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5); // 10px
    doc.setTextColor(isDarkMode ? 167 : 124, isDarkMode ? 139 : 58, isDarkMode ? 250 : 237); // Violet-400 or Violet-600
    doc.text("AI CAREER INTELLIGENCE", textX, 32, { charSpace: 0.5 });

    if (candidateName) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(candidateName, pageWidth - margin, 22, { align: 'right' });
      
      if (experienceYears !== undefined) {
        const expText = `${experienceYears} Years Exp.`;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.text(expText, pageWidth - margin, 28, { align: 'right' });
      }
      
      doc.setFontSize(10);
      doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - margin, 34, { align: 'right' });
    }

    // Divider
    doc.setDrawColor(cardBorderColor[0], cardBorderColor[1], cardBorderColor[2]);
    doc.setLineWidth(1);
    doc.line(margin, 45, pageWidth - margin, 45);

    yPos = 55;

    // --- Top Summary Section ---
    let r=239, g=68, b=68; let bgR=254, bgG=242, bgB=242;
    if (result.readinessScore >= 80) { r=34; g=197; b=94; bgR=240; bgG=253; bgB=244; }
    else if (result.readinessScore >= 60) { r=139; g=92; b=246; bgR=245; bgG=243; bgB=255; }
    else if (result.readinessScore >= 40) { r=234; g=179; b=8; bgR=254; bgG=252; bgB=232; }
    else if (result.readinessScore >= 20) { r=249; g=115; b=22; bgR=255; bgG=247; bgB=237; }

    drawCard(margin, yPos, 60, 45, [bgR, bgG, bgB]);
    
    doc.setTextColor(r, g, b);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("READINESS SCORE", margin + 30, yPos + 12, { align: "center" });

    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text(`${result.readinessScore}%`, margin + 30, yPos + 28, { align: "center" });

    doc.setFillColor(r, g, b); 
    doc.roundedRect(margin + 10, yPos + 34, 40, 8, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(result.readinessLevel.toUpperCase(), margin + 30, yPos + 39.5, { align: "center" });

    const summaryWidth = pageWidth - margin * 2 - 65;
    drawCard(margin + 65, yPos, summaryWidth, 48);
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    
    if (brainIcon) {
      doc.addImage(brainIcon, 'PNG', margin + 70, yPos + 7, 6, 6);
      doc.text("AI Executive Summary", margin + 78, yPos + 12);
    } else {
      doc.text("AI Executive Summary", margin + 75, yPos + 12);
    }
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
    const summaryLines = doc.splitTextToSize(result.executiveSummary, summaryWidth - 20);
    doc.text(summaryLines, margin + 75, yPos + 20);

    yPos += 55;

    // --- Critical Skill Gaps ---
    checkSpace(40);
    // Section Header
    doc.setFillColor(isDarkMode ? 69 : 254, isDarkMode ? 10 : 242, isDarkMode ? 10 : 242);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 14, 4, 4, 'F');
    
    if (alertIcon) {
      doc.addImage(alertIcon, 'PNG', margin + 6, yPos + 3.5, 7, 7);
    }
    
    doc.setTextColor(isDarkMode ? 252 : 185, isDarkMode ? 165 : 28, isDarkMode ? 165 : 28);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Critical Skill Gaps", margin + 16, yPos + 9.5);
    yPos += 16;

    if (Array.isArray(result.skillGaps)) {
      result.skillGaps.forEach(gap => {
        const fullWidth = pageWidth - (margin * 2);
        const reasonLines = doc.splitTextToSize(gap.reason, fullWidth - 30);
        const cardHeight = 24 + (reasonLines.length * 5);
        
        checkSpace(cardHeight + 8);
        drawCard(margin, yPos, fullWidth, cardHeight);

        // Priority Bullet (Left side)
        const isHigh = gap.priority === 'High';
        const priorityColor = isHigh ? [239, 68, 68] : [234, 179, 8];
        doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
        doc.circle(margin + 6, yPos + 11.5, 1.5, 'F');

        // Priority Badge (Right Aligned)
        const priorityBg = isHigh ? [254, 242, 242] : [254, 252, 232];
        
        // Badge BG
        doc.setFillColor(priorityBg[0], priorityBg[1], priorityBg[2]);
        doc.roundedRect(margin + fullWidth - 35, yPos + 6, 25, 6, 3, 3, 'F');
        // Badge Text
        doc.setTextColor(priorityColor[0], priorityColor[1], priorityColor[2]);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(gap.priority.toUpperCase(), margin + fullWidth - 22.5, yPos + 10, { align: 'center' });

        // Title
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(gap.skill, margin + 12, yPos + 10);

        // Status Badge (Next to Title) - Compact
        const skillWidth = doc.getTextWidth(gap.skill);
        // Dark Grey Badge like screenshot
        doc.setFillColor(63, 63, 70); // Slate-700
        const statusW = doc.getTextWidth(gap.status) + 8;
        doc.roundedRect(margin + 12 + skillWidth + 8, yPos + 6, statusW, 6, 3, 3, 'F');
        doc.setTextColor(212, 212, 216); // Slate-300
        doc.setFontSize(8);
        doc.text(gap.status.toUpperCase(), margin + 12 + skillWidth + 12, yPos + 10);

        // Reason
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(reasonLines, margin + 12, yPos + 18);

        yPos += cardHeight + 4;
      });
    }

    yPos += 8;

    // --- Recommended Learning Path (Full Width) ---
    checkSpace(40);
    doc.setFillColor(isDarkMode ? 46 : 245, isDarkMode ? 16 : 243, isDarkMode ? 101 : 255); // Violet-950 or Violet-50
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 14, 4, 4, 'F');
    
    // Icon
    if (bookIcon) {
      doc.addImage(bookIcon, 'PNG', margin + 6, yPos + 3.5, 7, 7);
    }

    doc.setTextColor(isDarkMode ? 109 : 109, isDarkMode ? 40 : 40, isDarkMode ? 217 : 217); // Violet-700
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Recommended Learning Path", margin + 16, yPos + 9.5);
    yPos += 16;

    if (Array.isArray(result.learningPath)) {
      result.learningPath.forEach((step) => {
        const fullWidth = pageWidth - (margin * 2);
        const descLines = doc.splitTextToSize(step.description, fullWidth - 30);
        
        // Calculate height including the suggestion box
        // Title (12) + Desc (lines*5) + Gap (8) + SuggestionBox (22) + Padding (15)
        const suggestionBoxHeight = 22;
        const cardHeight = 25 + (descLines.length * 5) + suggestionBoxHeight;
        
        checkSpace(cardHeight + 8);

        drawCard(margin, yPos, fullWidth, cardHeight);

        // Step ID
        doc.setTextColor(124, 58, 237);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(step.step.toUpperCase(), margin + 10, yPos + 8);

        // Title
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(12);
        doc.text(step.title, margin + 10, yPos + 14);
        
        // Time Badge - Same Line as Title, Right Aligned
        const timeW = doc.getTextWidth(step.estimatedTime) + 10;
        const timeX = margin + fullWidth - timeW - 10;
        
        doc.setFillColor(isDarkMode ? 46 : 245, isDarkMode ? 16 : 243, isDarkMode ? 101 : 255);
        doc.roundedRect(timeX, yPos + 8, timeW, 8, 4, 4, 'F');
        
        doc.setTextColor(isDarkMode ? 109 : 109, isDarkMode ? 40 : 40, isDarkMode ? 217 : 217);
        doc.setFontSize(9);
        doc.text(step.estimatedTime, timeX + 5, yPos + 13.5);

        // Desc
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(descLines, margin + 10, yPos + 22);

        // Suggestion Box (Website Style Match)
        const boxY = yPos + 24 + (descLines.length * 5);
        // Dark background for box (Slate-800) - Match screenshot
        const boxBg = isDarkMode ? [39, 39, 42] : [244, 244, 245]; // Slate-800 or Slate-100
        doc.setFillColor(boxBg[0], boxBg[1], boxBg[2]);
        // No border, just fill
        doc.roundedRect(margin + 10, boxY, fullWidth - 20, 22, 4, 4, 'F');
        
        // Icon Box (Amber-900/50 or Amber-100)
        const iconBg = isDarkMode ? [69, 26, 3] : [254, 252, 232]; // Amber-950 or Amber-50
        doc.setFillColor(iconBg[0], iconBg[1], iconBg[2]);
        doc.roundedRect(margin + 14, boxY + 4, 14, 14, 3, 3, 'F');
        
        // Icon (Amber-500 or Amber-600)
        drawLightbulbIcon(margin + 15, boxY + 5, 12, [245, 158, 11]); // Amber-500

        // Label
        doc.setTextColor(isDarkMode ? 161 : 113, isDarkMode ? 161 : 113, isDarkMode ? 170 : 122); // Slate-400 or Slate-500
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("RECOMMENDED SUGGESTION", margin + 34, boxY + 8);

        // Resource Name (Bold)
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(step.resourceName, margin + 34, boxY + 13);

        // Suggestion
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(step.resourceSuggestion, margin + 34, boxY + 18);

        yPos += cardHeight + 4;
      });
    }

    yPos += 8;
    
    // --- Alternative Roles ---
    const rolesList = result.alternativeRoles || result.alternativeCareerRoles || [];
    const sortedRoles = [...rolesList].sort((a, b) => b.matchPercentage - a.matchPercentage);
    let totalSectionHeight = 18; // Header + padding
    const fullWidth = pageWidth - (margin * 2);
    
    sortedRoles.forEach(role => {
      const matchLines = doc.splitTextToSize(role.matchReason, fullWidth - 30);
      const cardHeight = 28 + (matchLines.length * 5);
      totalSectionHeight += cardHeight + 4;
    });
    
    checkSpace(totalSectionHeight > (pageHeight - margin * 2) ? 40 : totalSectionHeight);
    
    // Draw Section Background (Header)
    doc.setFillColor(isDarkMode ? 24 : 24, isDarkMode ? 24 : 24, isDarkMode ? 27 : 27); // Slate-900
    if (yPos + totalSectionHeight <= pageHeight - margin) {
      doc.roundedRect(margin, yPos, fullWidth, totalSectionHeight, 6, 6, 'F');
    } else {
      doc.roundedRect(margin, yPos, fullWidth, 14, 4, 4, 'F');
    }
    
    // Icon
    if (briefcaseIcon) {
      doc.addImage(briefcaseIcon, 'PNG', margin + 8, yPos + 3.5, 7, 7);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Alternative Career Paths", margin + 18, yPos + 9.5);
    
    yPos += 18;

    if (Array.isArray(sortedRoles)) {
      sortedRoles.forEach(role => {
        const matchLines = doc.splitTextToSize(role.matchReason, fullWidth - 30);
        const cardHeight = 28 + (matchLines.length * 5);

        checkSpace(cardHeight + 8);

        // Card BG - Dark theme for alternative roles
        const roleCardBg: [number, number, number] = isDarkMode ? [39, 39, 42] : [24, 24, 27]; // Slate-800 or Slate-900
        doc.setFillColor(roleCardBg[0], roleCardBg[1], roleCardBg[2]);
        doc.setDrawColor(cardBorderColor[0], cardBorderColor[1], cardBorderColor[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin + 4, yPos, fullWidth - 8, cardHeight, 4, 4, 'FD');

        // Role Name
        doc.setTextColor(255, 255, 255); // Always white text on dark bg
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(role.role, margin + 14, yPos + 10);

        // Percent Badge
        const percentText = `${role.matchPercentage}% Match`;
        const percentW = doc.getTextWidth(percentText) + 8;
        doc.setFillColor(76, 29, 149); // Violet-900
        doc.roundedRect(pageWidth - margin - percentW - 14, yPos + 6, percentW, 6, 2, 2, 'F');
        doc.setTextColor(196, 181, 253); // Violet-300
        doc.setFontSize(9);
        doc.text(percentText, pageWidth - margin - percentW - 10, yPos + 10);

        // Bar BG
        doc.setFillColor(63, 63, 70); // Slate-700
        doc.roundedRect(margin + 14, yPos + 14, fullWidth - 28, 2.5, 1.25, 1.25, 'F');
        // Bar Fill
        doc.setFillColor(139, 92, 246); // Violet-500
        const fillW = ((fullWidth - 28) * role.matchPercentage) / 100;
        doc.roundedRect(margin + 14, yPos + 14, fillW, 2.5, 1.25, 1.25, 'F');
        
        // Reason (Full)
        doc.setTextColor(161, 161, 170); // Slate-400
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(matchLines, margin + 14, yPos + 22);

        yPos += cardHeight + 4;
      });
    }

    const filename = `SkillBridge_Analysis_${jobRole ? jobRole : "Report"}_${candidateName ? candidateName.replace(/\s+/g, "_") : "User"}.pdf`;
    doc.save(filename);
    return true;
  } catch (err) {
    console.error("Failed to generate PDF:", err);
    return false;
  }
};
