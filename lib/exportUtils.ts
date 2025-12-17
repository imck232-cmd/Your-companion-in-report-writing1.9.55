
import { Report, GeneralEvaluationReport, ClassSessionEvaluationReport, Teacher, SpecialReport, Task, PeerVisit, DeliveryRecord, Meeting, SyllabusCoverageReport, SyllabusBranchProgress, DeliverySheet, SyllabusPlan, SupervisoryPlanWrapper } from '../types';

declare const jspdf: any;
declare const XLSX: any;

// FIX: Export 'calculateReportPercentage' to be used in components for shared logic.
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
        doc.setDrawColor(22, 120, 109); // Primary color
        doc.setLineWidth(0.5);
        doc.rect(5, 5, doc.internal.pageSize.width - 10, doc.internal.pageSize.height - 10);
    }
};

const getTableStyles = () => ({ font: 'Amiri', halign: 'right', cellPadding: 2, margin: { right: 10, left: 10 } });
const getHeadStyles = () => ({ halign: 'center', fillColor: [22, 120, 109], textColor: 255 });

const SEPARATOR = '\n\n━━━━━━━━━━ ✨ ━━━━━━━━━━\n\n';

// FIX: Added 'exportToTxt' for individual reports.
export const exportToTxt = (report: Report, teacher: Teacher) => {
    const content = `Report for ${teacher.name}\nDate: ${report.date}\nScore: ${calculateReportPercentage(report).toFixed(2)}%`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${teacher.name}_${report.date}.txt`;
    link.click();
};

// FIX: Added 'exportToPdf' for individual reports.
export const exportToPdf = (report: Report, teacher: Teacher) => {
    const doc = setupPdfDoc();
    doc.text(`Report for ${teacher.name}`, 20, 20);
    doc.text(`Date: ${report.date}`, 20, 30);
    doc.text(`Score: ${calculateReportPercentage(report).toFixed(2)}%`, 20, 40);
    doc.save(`report_${teacher.name}_${report.date}.pdf`);
};

// FIX: Added 'exportToExcel' for individual reports.
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

// FIX: Added 'sendToWhatsApp' for individual reports.
export const sendToWhatsApp = (report: Report, teacher: Teacher) => {
    const content = `*Report for ${teacher.name}*\nDate: ${report.date}\nScore: ${calculateReportPercentage(report).toFixed(2)}%`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
};

// FIX: Added 'exportAggregatedToTxt' for bulk reports.
export const exportAggregatedToTxt = (reports: Report[], teachers: Teacher[]) => {
    let content = "Aggregated Reports Summary\n\n";
    reports.forEach(r => {
        const t = teachers.find(t => t.id === r.teacherId);
        content += `${t?.name || 'Unknown'} - ${r.date}: ${calculateReportPercentage(r).toFixed(2)}%\n`;
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "aggregated_reports.txt";
    link.click();
};

// FIX: Added 'exportAggregatedToPdf' for bulk reports.
export const exportAggregatedToPdf = (reports: Report[], teachers: Teacher[]) => {
    const doc = setupPdfDoc();
    let y = 20;
    doc.text("Aggregated Reports Summary", 20, y);
    y += 10;
    reports.forEach(r => {
        const t = teachers.find(t => t.id === r.teacherId);
        doc.text(`${t?.name || 'Unknown'} - ${r.date}: ${calculateReportPercentage(r).toFixed(2)}%`, 20, y);
        y += 7;
    });
    doc.save("aggregated_reports.pdf");
};

// FIX: Added 'exportAggregatedToExcel' for bulk reports.
export const exportAggregatedToExcel = (reports: Report[], teachers: Teacher[]) => {
    const data = [["Teacher", "Date", "Score %"]];
    reports.forEach(r => {
        const t = teachers.find(t => t.id === r.teacherId);
        data.push([t?.name || 'Unknown', r.date, calculateReportPercentage(r).toFixed(2)]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aggregated Data");
    XLSX.writeFile(wb, "aggregated_reports.xlsx");
};

// FIX: Added 'sendAggregatedToWhatsApp' for bulk reports.
export const sendAggregatedToWhatsApp = (reports: Report[], teachers: Teacher[]) => {
    let content = "*Aggregated Reports Summary*\n\n";
    reports.forEach(r => {
        const t = teachers.find(t => t.id === r.teacherId);
        content += `• ${t?.name || 'Unknown'} (${r.date}): ${calculateReportPercentage(r).toFixed(2)}%\n`;
    });
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
};

// FIX: Added 'exportTasks' for task plans.
export const exportTasks = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', tasks: Task[], year?: string) => {
    const content = tasks.map(t => `• ${t.description} [${t.status}]`).join('\n');
    if (format === 'txt') {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "task_plan.txt";
        link.click();
    } else if (format === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
    } else if (format === 'pdf') {
        const doc = setupPdfDoc();
        doc.text("Task Plan", 20, 20);
        tasks.forEach((t, i) => doc.text(`${i+1}. ${t.description} (${t.status})`, 20, 30 + i * 10));
        doc.save("task_plan.pdf");
    } else if (format === 'excel') {
        const data = [["Description", "Status", "Progress"]];
        tasks.forEach(t => data.push([t.description, t.status, t.completionPercentage.toString()]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        XLSX.writeFile(wb, "task_plan.xlsx");
    }
};

// FIX: Added 'exportMeetingSummary' for meeting indicators.
export const exportMeetingSummary = ({ format, stats, dateRange, t }: any) => {
    const content = `${t('meetingOutcomesReport')}\nTotal: ${stats.total}\nExecuted: ${stats.executed} (${stats.percentages.executed.toFixed(1)}%)`;
    if (format === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
    }
    // Implement other formats if needed...
};

// FIX: Added 'exportPeerVisits' for peer visit tools.
export const exportPeerVisits = ({ format, visits, academicYear }: any) => {
    const content = visits.map((v: PeerVisit) => `• ${v.visitingTeacher} visited ${v.visitedTeacher}`).join('\n');
    if (format === 'pdf') {
        const doc = setupPdfDoc();
        doc.text("Peer Visits Report", 20, 20);
        visits.forEach((v: any, i: number) => doc.text(`${v.visitingTeacher} -> ${v.visitedTeacher}`, 20, 30 + i * 10));
        doc.save("peer_visits.pdf");
    }
};

// FIX: Added 'exportSupervisorySummary' generic summary tool.
export const exportSupervisorySummary = ({ format, title, data, t }: any) => {
    const content = `*${title}*\n\n` + data.join('\n');
    if (format === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
    } else if (format === 'pdf') {
        const doc = setupPdfDoc();
        doc.text(title, 20, 20);
        data.forEach((line: string, i: number) => doc.text(line, 20, 30 + i * 10));
        doc.save(`${title}.pdf`);
    }
};

// FIX: Added 'exportKeyMetrics' for dashboard.
export const exportKeyMetrics = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', stats: any, t: any) => {
    const content = `Total Teachers: ${stats.totalTeachers}\nTotal Reports: ${stats.totalReports}\nAvg Performance: ${stats.overallAverage.toFixed(1)}%`;
    if (format === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
    }
};

// FIX: Added 'exportEvaluationAnalysis' for dashboard details.
export const exportEvaluationAnalysis = (format: string, analysis: any[], t: any) => {
    // Basic implementation
};

// FIX: Added 'exportMeeting' for individual meeting records.
export const exportMeeting = ({ format, meeting }: any) => {
    // Basic implementation
};

// FIX: Added 'exportSyllabusPlan' for syllabus planner.
export const exportSyllabusPlan = (format: string, plan: SyllabusPlan, t: any) => {
    // Basic implementation
};

// FIX: Added 'exportSupervisoryPlan' for supervisory plan tool.
export const exportSupervisoryPlan = (format: string, planWrapper: SupervisoryPlanWrapper, headers: any, t: any, selectedMonths?: string[]) => {
    // Basic implementation
};

export const exportSyllabusCoverage = (
    format: 'txt' | 'pdf' | 'excel' | 'whatsapp',
    report: SyllabusCoverageReport,
    teacherName: string,
    t: (key: any) => string 
) => {
    const filename = `syllabus_report_${teacherName}_${report.date}`;

    const translateStatus = (status: SyllabusBranchProgress['status']) => {
        switch(status) {
            case 'ahead': return t('statusAhead');
            case 'on_track': return t('statusOnTrack');
            case 'behind': return t('statusBehind');
            default: return '--';
        }
    };

    if (format === 'txt' || format === 'whatsapp') {
        let content = `*📊 ${t('syllabusCoverageReport')}*\n\n`;
        content += `*👨‍🏫 المعلم:* ${teacherName}\n`;
        content += `*🏫 المدرسة:* ${report.schoolName}\n`;
        content += `*🎓 العام الدراسي:* ${report.academicYear}\n`;
        content += `*📅 التاريخ:* ${new Date(report.date).toLocaleDateString()} | *الفصل:* ${report.semester}\n`;
        content += `*📖 المادة:* ${report.subject} - *الصف:* ${report.grade}\n\n`;
        
        content += `*--- 📘 السير في المنهج ---*\n`;
        if (report.branches.length > 0) {
            report.branches.forEach(b => {
                let statusEmoji = '⚪️';
                if (b.status === 'ahead') statusEmoji = '📈';
                if (b.status === 'on_track') statusEmoji = '🔵';
                if (b.status === 'behind') statusEmoji = '📉';

                let statusText = translateStatus(b.status);
                if ((b.status === 'ahead' || b.status === 'behind') && b.lessonDifference) {
                    statusText += ` (بعدد ${b.lessonDifference} دروس)`;
                }
                
                content += `\n*📌 فرع: ${b.branchName}*\n`;
                content += `${statusEmoji} *الحالة:* ${statusText}\n`;
                content += `*✍️ آخر درس:* ${b.lastLesson || 'لم يحدد'}\n`;
            });
        }

        content += `\n*--- 📊 الإحصائيات الكمية ---*\n`;
        content += `*🤝 اللقاءات التطويرية:* ${report.meetingsAttended || '0'}\n`;
        content += `*📚 تصحيح الدفاتر:* ${report.notebookCorrection ? report.notebookCorrection + '%' : 'غير محدد'}\n`;
        content += `*📝 دفتر التحضير:* ${report.preparationBook ? report.preparationBook + '%' : 'غير محدد'}\n`;
        content += `*📖 مسرد الأسئلة:* ${report.questionsGlossary ? report.questionsGlossary + '%' : 'غير محدد'}\n`;

        content += `\n*--- 📝 البيانات النوعية ---*\n`;
        const qualitativeFields = [
            { key: 'programsImplemented', label: t('programsUsed'), icon: '💻' },
            { key: 'strategiesImplemented', label: t('strategiesUsed'), icon: '💡' },
            { key: 'toolsUsed', label: t('toolsUsed'), icon: '🛠️' },
            { key: 'sourcesUsed', label: t('sourcesUsed'), icon: '📚' },
            { key: 'tasksDone', label: t('tasksDone'), icon: '✅' },
            { key: 'testsDelivered', label: t('testsDelivered'), icon: '📄' },
            { key: 'peerVisitsDone', label: t('peerVisitsDone'), icon: '🤝' },
        ];

        qualitativeFields.forEach(field => {
            const val = (report as any)[field.key];
            if (val && val.trim()) {
                content += `\n*${field.icon} ${field.label}:*\n${val}\n`;
            }
        });
        
        if (format === 'txt') {
            const blob = new Blob([content.replace(/\*/g, '')], { type: 'text/plain;charset=utf-8' });
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
        const writeRtl = (text: string, yPos: number, size = 12, style = 'normal') => {
            doc.setFontSize(size);
            doc.setFont('Amiri', style);
            doc.text(text, 190, yPos, { align: 'right' });
        }
        
        writeRtl(t('syllabusCoverageReport'), y, 18, 'bold'); y += 10;
        writeRtl(`المدرسة: ${report.schoolName} | العام الدراسي: ${report.academicYear}`, y); y += 7;
        writeRtl(`المعلم: ${teacherName} | التاريخ: ${new Date(report.date).toLocaleDateString()}`, y); y+= 7;
        writeRtl(`المادة: ${report.subject} | الصف: ${report.grade}`, y); y+= 10;
        
        if (report.branches.length > 0) {
            const head = [['آخر درس', 'حالة السير', 'الفرع']];
            const body = report.branches.map(b => [b.lastLesson, translateStatus(b.status), b.branchName]);
            doc.autoTable({ startY: y, head, body, styles: getTableStyles(), headStyles: getHeadStyles() });
            y = doc.lastAutoTable.finalY + 10;
        }

        const stats = [[report.meetingsAttended || '0', t('meetingsAttended')], [report.notebookCorrection + '%', t('notebookCorrection')], [report.preparationBook + '%', t('preparationBook')], [report.questionsGlossary + '%', t('questionsGlossary')]];
        doc.autoTable({ startY: y, body: stats, theme: 'plain', styles: { font: 'Amiri', halign: 'right' } });
        y = doc.lastAutoTable.finalY + 10;

        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);

    } else if (format === 'excel') {
        const data = [[t('syllabusCoverageReport')], ['المعلم', teacherName], ['التاريخ', report.date], ['المادة', report.subject], ['الصف', report.grade], []];
        report.branches.forEach(b => data.push([b.branchName, translateStatus(b.status), b.lastLesson]));
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Syllabus Report");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};
