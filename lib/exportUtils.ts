
import { Report, GeneralEvaluationReport, ClassSessionEvaluationReport, Teacher, SpecialReport, Task, PeerVisit, DeliveryRecord, Meeting, SyllabusCoverageReport, SyllabusBranchProgress, DeliverySheet, SyllabusPlan, SupervisoryPlanWrapper, SchoolCalendarEvent } from '../types';

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

    const getScoreEmoji = (score: number) => {
        if (score === 4) return "🟢";
        if (score === 3) return "🔵";
        if (score === 2) return "🟡";
        if (score === 1) return "🟠";
        return "🔴";
    };

    const getPerformanceDesc = (p: number) => {
        const val = Number(p);
        if (val <= 30) return "القصور كبير";
        if (val <= 40) return "يتطلب تحسين أكبر";
        if (val <= 60) return "تحسن جميل";
        if (val <= 74) return "تحسن كبير";
        if (val <= 80) return "تحسن كبير ملحوظ";
        if (val <= 89) return "عملك متميز وبقي القليل لتصل إلى التميز الأكبر";
        return "عمل ممتاز جداً، بوركت جهودكم المباركة";
    };

    if (report.evaluationType === 'class_session') {
        const r = report as ClassSessionEvaluationReport;
        content += `*📝 تقرير تقييم الحصة الدراسية*\n\n`;
        content += `🏫 *المدرسة:* ${r.school}\n`;
        content += `👨‍🏫 *المعلم:* ${teacher.name}\n`;
        content += `📅 *التاريخ:* ${r.date} | *الفصل:* ${r.semester}\n`;
        content += `📖 *المادة:* ${r.subject} | *الصف:* ${r.grades}\n`;
        content += `--------------------------------\n`;
        content += `📈 *نسبة الأداء الإجمالية: ${percentage}%*\n`;
        content += `⭐ *التقدير:* ${getPerformanceDesc(Number(percentage))}\n`;
        content += `--------------------------------\n\n`;

        content += `*📊 تفاصيل التقييم بالدرجات:*\n`;
        r.criterionGroups.forEach(group => {
            content += `\n*--- ${group.title} ---*\n`;
            group.criteria.forEach(c => {
                content += `${getScoreEmoji(c.score)} ${c.label}: ${c.score}/4\n`;
            });
        });
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
    }
};

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

export const sendAggregatedToWhatsApp = (reports: Report[], teachers: Teacher[]) => {
    const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
    let content = "*📝 ملخص التقارير المجمعة*\n\n";
    reports.forEach(r => {
        const tName = teacherMap.get(r.teacherId) || 'Unknown';
        content += `👤 *${tName}* | 📅 ${r.date} | 📈 *${calculateReportPercentage(r).toFixed(1)}%*\n`;
    });
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
};

export const exportSyllabusCoverage = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', report: SyllabusCoverageReport, teacherName: string, t: any) => {};

// --- New: Export School Calendar ---
export const exportSchoolCalendar = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', events: SchoolCalendarEvent[], schoolName: string) => {
    const title = `التقويم المدرسي - ${schoolName}`;
    if (format === 'txt' || format === 'whatsapp') {
        let content = `*📅 ${title}*\n\n`;
        events.forEach(e => {
            content += `🔹 *البرنامج:* ${e.program || '---'}\n`;
            content += `   📅 *من:* ${e.fromDay} (${e.fromDate})\n`;
            content += `   📅 *إلى:* ${e.toDay} (${e.toDate})\n`;
            content += `   📥 *التسليم:* ${e.deliveryDate || '---'}\n`;
            if (e.notes) content += `   📝 *ملاحظات:* ${e.notes}\n`;
            content += `------------------\n`;
        });
        if (format === 'whatsapp') {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
        } else {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `calendar_${schoolName}.txt`;
            link.click();
        }
    } else if (format === 'excel') {
        const data = events.map(e => ({
            'البرنامج': e.program,
            'من يوم': e.fromDay,
            'من تاريخ': e.fromDate,
            'إلى يوم': e.toDay,
            'إلى تاريخ': e.toDate,
            'موعد التسليم': e.deliveryDate,
            'ملاحظات': e.notes
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "التقويم");
        XLSX.writeFile(wb, `calendar_${schoolName}.xlsx`);
    } else if (format === 'pdf') {
        const doc = setupPdfDoc('landscape');
        doc.text(title, 140, 20, { align: 'center' });
        const body = events.map(e => [
            e.notes,
            e.deliveryDate,
            e.program,
            `${e.toDay}\n${e.toDate}`,
            `${e.fromDay}\n${e.fromDate}`
        ]);
        doc.autoTable({
            startY: 30,
            head: [['ملاحظات', 'موعد التسليم', 'البرنامج', 'إلى', 'من']],
            body: body,
            styles: getTableStyles(),
            headStyles: getHeadStyles()
        });
        addBorderToPdf(doc);
        doc.save(`calendar_${schoolName}.pdf`);
    }
};

export const exportTasks = (format: string, tasks: Task[], year?: string) => {};
export const exportMeetingSummary = ({ format, stats, dateRange, t }: any) => {};
export const exportPeerVisits = ({ format, visits, academicYear }: any) => {};
export const exportSupervisorySummary = ({ format, title, data, t }: any) => {};

export const exportKeyMetrics = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', stats: any, schoolName: string) => {
    let content = `*📊 مؤشرات الأداء الرئيسية - ${schoolName}*\n\n`;
    content += `👨‍🏫 إجمالي المعلمين: ${stats.totalTeachers}\n`;
    content += `📝 إجمالي التقارير: ${stats.totalReports}\n`;
    content += `📈 متوسط الأداء العام: ${stats.overallAverage.toFixed(1)}%\n`;
    content += `✅ نسبة إنجاز المهام: ${stats.taskCompletion.toFixed(1)}%\n`;
    content += `📥 كشوفات الاستلام: ${stats.deliveryCompletion.toFixed(1)}%\n`;

    if (format === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
    } else if (format === 'txt') {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `metrics_${schoolName}.txt`;
        link.click();
    }
};

export const exportEvaluationAnalysis = (format: string, analysis: any[], t: any) => {};
export const exportMeeting = ({ format, meeting }: any) => {};
export const exportSyllabusPlan = (format: string, plan: SyllabusPlan, t: any) => {};
export const exportSupervisoryPlan = (format: string, planWrapper: SupervisoryPlanWrapper, headers: any, t: any, selectedMonths?: string[]) => {};
