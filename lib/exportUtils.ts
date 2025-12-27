
import { Report, GeneralEvaluationReport, ClassSessionEvaluationReport, Teacher, SpecialReport, Task, PeerVisit, DeliveryRecord, Meeting, SyllabusCoverageReport, SyllabusBranchProgress, DeliverySheet, SyllabusPlan, SupervisoryPlanWrapper } from '../types';

declare const jspdf: any;
declare const XLSX: any;

export const calculateReportPercentage = (report: Report): number => {
    let allScores: number[] = [];
    if (report.evaluationType === 'general' || report.evaluationType === 'special') {
        const criteria = (report as GeneralEvaluationReport | SpecialReport).criteria;
        if (!criteria || criteria.length === 0) return 0;
        allScores = criteria.map(c => c.score);
    } else if (report.evaluationType === 'class_session') {
        const groups = (report as ClassSessionEvaluationReport).criterionGroups;
        if (!groups || groups.length === 0) return 0;
        allScores = groups.flatMap(g => g.criteria).map(c => c.score);
    }
    if (allScores.length === 0) return 0;
    const totalScore = allScores.reduce((sum, score) => sum + score, 0);
    const maxPossibleScore = allScores.length * 4;
    if (maxPossibleScore === 0) return 0;
    return (totalScore / maxPossibleScore) * 100;
};

const setupPdfDoc = (orientation: 'portrait' | 'landscape' = 'portrait') => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation });
    try {
        doc.addFont('https://fonts.gstatic.com/s/amiri/v25/J7aRnpd8CGxBHqU2sQ.woff2', 'Amiri', 'normal');
        doc.setFont('Amiri');
    } catch (e) {
        console.warn('PDF font loading failed, using default.');
    }
    return doc;
};

const addBorderToPdf = (doc: any) => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(22, 120, 109); 
        doc.setLineWidth(0.5);
        doc.rect(5, 5, doc.internal.pageSize.width - 10, doc.internal.pageSize.height - 10);
    }
};

const getTableStyles = () => ({ font: 'Amiri', halign: 'right', cellPadding: 2, margin: { right: 10, left: 10 } });
const getHeadStyles = () => ({ halign: 'center', fillColor: [22, 120, 109], textColor: 255 });

export const exportToTxt = (report: Report, teacher: Teacher) => {
    const content = `Report for ${teacher.name}\nDate: ${report.date}\nScore: ${calculateReportPercentage(report).toFixed(2)}%`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${teacher.name}_${report.date}.txt`;
    link.click();
};

export const exportToPdf = (report: Report, teacher: Teacher) => {
    const doc = setupPdfDoc();
    doc.text(`Report for ${teacher.name}`, 20, 20);
    doc.text(`Date: ${report.date}`, 20, 30);
    doc.text(`Score: ${calculateReportPercentage(report).toFixed(2)}%`, 20, 40);
    doc.save(`report_${teacher.name}_${report.date}.pdf`);
};

export const exportToExcel = (report: Report, teacher: Teacher) => {
    const data = [
        ["Teacher", teacher.name],
        ["Date", report.date],
        ["Score", `${calculateReportPercentage(report).toFixed(2)}%`]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `report_${teacher.name}_${report.date}.xlsx`);
};

export const sendToWhatsApp = (report: Report, teacher: Teacher) => {
    let content = "";
    const percentage = calculateReportPercentage(report).toFixed(1);

    if (report.evaluationType === 'class_session') {
        const r = report as ClassSessionEvaluationReport;
        content += `*📝 تقرير تقييم الحصة الدراسية*\n\n`;
        content += `🏫 *المدرسة:* ${r.school}\n`;
        content += `👨‍🏫 *المعلم:* ${teacher.name}\n`;
        content += `📅 *التاريخ:* ${r.date} | *الفصل:* ${r.semester}\n`;
        content += `📖 *المادة:* ${r.subject} | *الصف:* ${r.grades}\n`;
        content += `--------------------------------\n`;
        content += `📈 *نسبة الأداء الإجمالية: ${percentage}%*\n`;
        content += `--------------------------------\n\n`;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
};

// --- Added for AggregatedReports fixes ---

/**
 * Exports multiple reports to a TXT file.
 */
export const exportAggregatedToTxt = (reports: Report[], teachers: Teacher[]) => {
    const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
    let content = "ملخص التقارير المجمعة\n\n";
    reports.forEach(r => {
        const tName = teacherMap.get(r.teacherId) || 'Unknown';
        content += `المعلم: ${tName} | التاريخ: ${r.date} | النسبة: ${calculateReportPercentage(r).toFixed(2)}%\n`;
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aggregated_reports.txt`;
    link.click();
};

/**
 * Exports multiple reports to a PDF file.
 */
export const exportAggregatedToPdf = (reports: Report[], teachers: Teacher[]) => {
    const doc = setupPdfDoc();
    const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
    let y = 20;
    doc.text("ملخص التقارير المجمعة", 190, y, { align: 'right' });
    y += 10;
    reports.forEach(r => {
        if (y > 280) { doc.addPage(); y = 20; }
        const tName = teacherMap.get(r.teacherId) || 'Unknown';
        doc.text(`${tName} - ${r.date} - ${calculateReportPercentage(r).toFixed(2)}%`, 190, y, { align: 'right' });
        y += 10;
    });
    addBorderToPdf(doc);
    doc.save(`aggregated_reports.pdf`);
};

/**
 * Exports multiple reports to an Excel file.
 */
export const exportAggregatedToExcel = (reports: Report[], teachers: Teacher[]) => {
    const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
    const data = reports.map(r => [
        teacherMap.get(r.teacherId) || 'Unknown',
        r.date,
        `${calculateReportPercentage(r).toFixed(2)}%`
    ]);
    data.unshift(["المعلم", "التاريخ", "النسبة"]);
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aggregated Reports");
    XLSX.writeFile(wb, `aggregated_reports.xlsx`);
};

/**
 * Sends a summary of multiple reports to WhatsApp.
 */
export const sendAggregatedToWhatsApp = (reports: Report[], teachers: Teacher[]) => {
    const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
    let content = "*📝 ملخص التقارير المجمعة*\n\n";
    reports.forEach(r => {
        const tName = teacherMap.get(r.teacherId) || 'Unknown';
        content += `👤 *${tName}* | 📅 ${r.date} | 📈 *${calculateReportPercentage(r).toFixed(1)}%*\n`;
    });
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
};

export const exportSyllabusCoverage = (
    format: 'txt' | 'pdf' | 'excel' | 'whatsapp',
    report: SyllabusCoverageReport,
    teacherName: string,
    t: (key: any) => string 
) => {
    const filename = `Syllabus_Report_${teacherName}_${report.date}`;

    const translateStatus = (status: SyllabusBranchProgress['status']) => {
        switch(status) {
            case 'ahead': return 'متقدم عن خطة الوزارة';
            case 'on_track': return 'مطابق لخطة الوزارة';
            case 'behind': return 'متأخر عن خطة الوزارة';
            default: return '--';
        }
    };

    if (format === 'txt' || format === 'whatsapp') {
        let content = `*📊 تقرير السير في المنهج*\n\n`;
        content += `*👨‍🏫 المعلم:* ${teacherName}\n`;
        content += `*🏫 المدرسة:* ${report.schoolName}\n`;
        content += `*🎓 العام الدراسي:* ${report.academicYear}\n`;
        content += `*📅 التاريخ:* ${report.date} | *الفصل:* ${report.semester}\n`;
        content += `*📖 المادة:* ${report.subject} - *الصف:* ${report.grade}\n\n`;
        
        content += `*--- 📘 السير في المنهج ---*\n`;
        (report.branches || []).forEach(b => {
            let emoji = b.status === 'ahead' ? '📈' : b.status === 'behind' ? '📉' : '🔵';
            content += `\n*📌 فرع: ${b.branchName}*\n`;
            content += `${emoji} *الحالة:* ${translateStatus(b.status)}\n`;
            if (b.lessonDifference) content += `*🔢 الفارق:* ${b.lessonDifference} دروس\n`;
            content += `*✍️ آخر درس:* ${b.lastLesson || 'لا يوجد'}\n`;
        });

        content += `\n*--- 📊 الإحصائيات الكمية ---*\n`;
        content += `*🤝 اللقاءات التطويرية:* ${report.meetingsAttended || 0}\n`;
        content += `*📚 تصحيح الدفاتر:* ${report.notebookCorrection || 0}%\n`;
        content += `*📝 دفتر التحضير:* ${report.preparationBook || 0}%\n`;
        content += `*📖 مسرد الأسئلة:* ${report.questionsGlossary || 0}%\n`;

        content += `\n*--- 📝 البيانات النوعية ---*\n`;
        const qFields = [
            { k: 'programsImplemented', l: 'البرامج والمهارات المنفذة', i: '💻' },
            { k: 'strategiesImplemented', l: 'الاستراتيجيات المستخدمة', i: '💡' },
            { k: 'toolsUsed', l: 'الوسائل المستخدمة', i: '🛠️' },
            { k: 'sourcesUsed', l: 'المصادر المستخدمة', i: '📚' },
            { k: 'tasksDone', l: 'التكاليف المنفذة', i: '✅' },
            { k: 'testsDelivered', l: 'الاخبارات المسلمة', i: '📄' },
            { k: 'peerVisitsDone', l: 'الزيارات التبادلية', i: '🤝' },
        ];

        qFields.forEach(f => {
            const val = (report as any)[f.k];
            if (val) {
                content += `\n${f.i} *${f.l}:*\n${val}\n`;
            }
        });

        if (format === 'txt') {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${filename}.txt`;
            link.click();
        } else {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
        }

    } else if (format === 'pdf') {
        const doc = setupPdfDoc();
        let y = 20;
        const writeRtl = (text: string, yPos: number, size = 12) => {
            doc.setFontSize(size);
            doc.text(text, 190, yPos, { align: 'right' });
        }
        
        writeRtl("تقرير السير في المنهج", y, 16); y += 10;
        writeRtl(`المعلم: ${teacherName}`, y); y += 8;
        writeRtl(`المدرسة: ${report.schoolName}`, y); y += 8;
        writeRtl(`التاريخ: ${report.date}`, y); y += 12;

        const body = (report.branches || []).map(b => [
            b.lastLesson,
            b.lessonDifference + " دروس",
            translateStatus(b.status),
            b.branchName
        ]);

        doc.autoTable({
            startY: y,
            head: [['آخر درس', 'الفارق', 'الحالة', 'الفرع']],
            body: body,
            styles: getTableStyles(),
            headStyles: getHeadStyles()
        });

        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);

    } else if (format === 'excel') {
        const excelData = (report.branches || []).map(b => ({
            'الفرع': b.branchName,
            'الحالة': translateStatus(b.status),
            'الفارق': b.lessonDifference,
            'آخر درس': b.lastLesson
        }));
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Syllabus");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};

export const exportTasks = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', tasks: Task[], year?: string) => {};
export const exportMeetingSummary = ({ format, stats, dateRange, t }: any) => {};
export const exportPeerVisits = ({ format, visits, academicYear }: any) => {};
export const exportSupervisorySummary = ({ format, title, data, t }: any) => {};
export const exportKeyMetrics = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', stats: any, t: any) => {};
export const exportEvaluationAnalysis = (format: string, analysis: any[], t: any) => {};
export const exportMeeting = ({ format, meeting }: any) => {};
export const exportSyllabusPlan = (format: string, plan: SyllabusPlan, t: any) => {};
export const exportSupervisoryPlan = (format: string, planWrapper: SupervisoryPlanWrapper, headers: any, t: any, selectedMonths?: string[]) => {};
