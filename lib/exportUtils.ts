
import { Report, GeneralEvaluationReport, ClassSessionEvaluationReport, Teacher, SpecialReport, Task, PeerVisit, DeliveryRecord, Meeting, SyllabusCoverageReport, SyllabusBranchProgress, DeliverySheet, SyllabusPlan, SupervisoryPlanWrapper } from '../types';

declare const jspdf: any;
declare const XLSX: any;

// --- UTILITY FUNCTIONS ---
const getScorePercentage = (score: number, maxScore: number = 4) => {
    if (maxScore === 0) return 0;
    return (score / maxScore) * 100;
};

const setupPdfDoc = (orientation: 'portrait' | 'landscape' = 'portrait') => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation });
    // This is a base64 encoded Amiri font. You can generate this from a .ttf file.
    // This step is crucial for Arabic support in jsPDF.
    doc.addFont('https://fonts.gstatic.com/s/amiri/v25/J7aRnpd8CGxBHqU2sQ.woff2', 'Amiri', 'normal');
    doc.setFont('Amiri');
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

// --- TEACHER REPORT EXPORT ---

export const calculateReportPercentage = (report: Report): number => {
    let allScores: number[] = [];
    let maxScorePerItem = 4;

    if (report.evaluationType === 'general' || report.evaluationType === 'special') {
        allScores = (report as GeneralEvaluationReport | SpecialReport).criteria.map(c => c.score);
    } else if (report.evaluationType === 'class_session') {
        allScores = (report as ClassSessionEvaluationReport).criterionGroups.flatMap(g => g.criteria).map(c => c.score);
    }
    
    if (allScores.length === 0) return 0;
    const totalScore = allScores.reduce((sum, score) => sum + score, 0);
    const maxPossibleScore = allScores.length * maxScorePerItem;
    if (maxPossibleScore === 0) return 0;
    return (totalScore / maxPossibleScore) * 100;
};

const generateTextContent = (report: Report, teacher: Teacher): string => {
    let content = `*👤 تقرير لـ:* ${teacher.name}\n`;
    content += `*📅 تاريخ:* ${new Date(report.date).toLocaleDateString()}\n`;
    if (report.academicYear) content += `*🎓 العام الدراسي:* ${report.academicYear}\n`;
    content += `*🏫 المدرسة:* ${report.school}\n`;
    if (report.supervisorName) content += `*🧑‍🏫 المشرف:* ${report.supervisorName}\n`;
    if (report.semester) content += `*🗓️ الفصل الدراسي:* ${report.semester}\n`;
    content += `*📖 المادة:* ${report.subject}\n*👨‍🏫 الصفوف:* ${report.grades}\n`;

    content += `${SEPARATOR}--- *بطاقة معلومات المعلم* ---\n\n`;
    if (teacher.qualification) content += `*المؤهل الدراسي:* ${teacher.qualification}\n`;
    if (teacher.specialization) content += `*التخصص:* ${teacher.specialization}\n`;
    if (teacher.subjects) content += `*المواد التي يدرسها:* ${teacher.subjects}\n`;
    if (teacher.gradesTaught) content += `*الصفوف التي يدرسها:* ${teacher.gradesTaught}\n`;
    if (teacher.sectionsTaught) content += `*الشعب التي يدرسها:* ${teacher.sectionsTaught}\n`;
    if (teacher.weeklyHours) content += `*نصاب الحصص الأسبوعي:* ${teacher.weeklyHours}\n`;
    if (teacher.yearsOfExperience) content += `*سنوات الخبرة:* ${teacher.yearsOfExperience}\n`;
    if (teacher.yearsInSchool) content += `*سنوات العمل بالمدرسة:* ${teacher.yearsInSchool}\n`;
    if (teacher.phoneNumber) content += `*رقم الهاتف:* ${teacher.phoneNumber}\n`;

    if (report.evaluationType === 'general' || report.evaluationType === 'special') {
        const r = report as GeneralEvaluationReport | SpecialReport;
        const title = report.evaluationType === 'general' ? 'تقييم عام' : `تقرير خاص: ${report.templateName}`;
        content += `${SEPARATOR}--- *${title}* ---\n\n`;
        r.criteria.forEach(c => {
            content += `- 📋 *${c.label}:* ${c.score} / 4 (⭐ ${getScorePercentage(c.score, 4).toFixed(0)}%)\n`;
        });
        content += `\n*📊 النسبة المئوية النهائية:* ${calculateReportPercentage(r).toFixed(2)}%\n`;

        if (report.evaluationType === 'general') {
            content += `${SEPARATOR}*💡 أهم الاستراتيجيات المنفذة:*\n${report.strategies}\n`;
            content += `\n*🔧 أهم الوسائل المستخدمة:*\n${report.tools}\n`;
            content += `\n*💻 أهم البرامج المنفذة:*\n${report.programs}\n`;
        }

    } else if (report.evaluationType === 'class_session') {
        const r = report as ClassSessionEvaluationReport;
        content += `${SEPARATOR}--- *تقييم حصة دراسية (${r.subType})* ---\n\n`;
        content += `*🔎 نوع الزيارة:* ${r.visitType}\n`;
        content += `*🏫 الصف:* ${r.class} / ${r.section}\n`;
        content += `*📘 عنوان الدرس:* ${r.lessonName}\n`;

        r.criterionGroups.forEach(group => {
            content += `\n*📌 ${group.title}:*\n`;
            group.criteria.forEach(c => {
                content += `  - ${c.label}: ${c.score} / 4 (⭐ ${getScorePercentage(c.score, 4).toFixed(0)}%)\n`;
            });
        });
        content += `\n*📊 النسبة المئوية النهائية:* ${calculateReportPercentage(r).toFixed(2)}%\n`;
        content += `${SEPARATOR}*👍 الإيجابيات:*\n${r.positives}\n`;
        content += `\n*📝 ملاحظات للتحسين:*\n${r.notesForImprovement}\n`;
        content += `\n*🎯 التوصيات:*\n${r.recommendations}\n`;
        content += `\n*✍️ تعليق الموظف:*\n${r.employeeComment}\n`;
    }

    return content;
};

export const exportToTxt = (report: Report, teacher: Teacher) => {
    const content = generateTextContent(report, teacher).replace(/\*/g, '').replace(/[👤📅🏫📖👨‍🏫🏢💡🔧💻🧑‍🏫🗓️🔎📘📌📊👍📝🎯✍️🎓]/g, ''); // Remove markdown and icons for TXT
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${teacher.name}_${report.date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const generatePdfForReport = (doc: any, report: Report, teacher: Teacher, startY: number) => {
    let y = startY;
    const writeRtl = (text: string, yPos: number) => doc.text(text, 200, yPos, { align: 'right' });

    writeRtl(`تقرير لـ: ${teacher.name}`, y); y += 7;
    if (report.academicYear) { writeRtl(`العام الدراسي: ${report.academicYear}`, y); y += 7; }
    writeRtl(`تاريخ: ${new Date(report.date).toLocaleDateString()}`, y); y += 7;
    writeRtl(`المدرسة: ${report.school} | المادة: ${report.subject} | الصفوف: ${report.grades}`, y); y+= 10;
    
    // Teacher Details Card
    doc.setFont('Amiri', 'bold');
    writeRtl('بطاقة معلومات المعلم', y); y += 7;
    doc.setFont('Amiri', 'normal');
    const teacherDetails = [
        { label: 'المؤهل الدراسي', value: teacher.qualification },
        { label: 'التخصص', value: teacher.specialization },
        { label: 'المواد', value: teacher.subjects },
        { label: 'الصفوف', value: teacher.gradesTaught },
        { label: 'الشعب', value: teacher.sectionsTaught },
        { label: 'النصاب الأسبوعي', value: teacher.weeklyHours },
        { label: 'سنوات الخبرة', value: teacher.yearsOfExperience },
        { label: 'سنوات بالمدرسة', value: teacher.yearsInSchool },
        { label: 'رقم الهاتف', value: teacher.phoneNumber }
    ].filter(item => item.value);
    
    doc.autoTable({
        startY: y,
        body: teacherDetails.map(d => [d.value, d.label]),
        theme: 'plain',
        styles: { font: 'Amiri', halign: 'right', cellPadding: 1 },
        bodyStyles: { cellWidth: 'wrap' },
    });
    y = doc.lastAutoTable.finalY + 10;


    if (report.evaluationType === 'general' || report.evaluationType === 'special') {
        const r = report as GeneralEvaluationReport | SpecialReport;
        const title = report.evaluationType === 'general' ? 'تقييم عام' : `تقرير خاص: ${report.templateName}`;
        writeRtl(title, y); y += 7;

        doc.autoTable({
            startY: y,
            head: [['النسبة', 'الدرجة', 'المعيار']],
            body: r.criteria.map(c => [`%${getScorePercentage(c.score, 4).toFixed(0)}`, c.score, c.label]),
            styles: getTableStyles(), headStyles: getHeadStyles()
        });
        y = doc.lastAutoTable.finalY + 10;
        writeRtl(`النسبة النهائية: ${calculateReportPercentage(r).toFixed(2)}%`, y); y+=10;
        if(report.evaluationType === 'general'){
            doc.text(`أهم الاستراتيجيات المنفذة: ${report.strategies}`, 200, y, { align: 'right', maxWidth: 180 }); y += 15;
            doc.text(`أهم الوسائل المستخدمة: ${report.tools}`, 200, y, { align: 'right', maxWidth: 180 }); y += 15;
            doc.text(`أهم البرامج المنفذة: ${report.programs}`, 200, y, { align: 'right', maxWidth: 180 }); y += 10;
        }

    } else if (report.evaluationType === 'class_session') {
        const r = report as ClassSessionEvaluationReport;
        r.criterionGroups.forEach(group => {
            doc.autoTable({
                startY: y,
                head: [[group.title]],
                body: group.criteria.map(c => [c.label, c.score]),
                styles: getTableStyles(), headStyles: {...getHeadStyles(), fillColor: [75, 85, 99]},
                didParseCell: (data:any) => { data.cell.styles.halign = data.column.index === 1 ? 'center' : 'right' }
            });
            y = doc.lastAutoTable.finalY + 5;
        });
        y+=5;
        writeRtl(`النسبة النهائية: ${calculateReportPercentage(r).toFixed(2)}%`, y); y+=10;
        doc.text(`الإيجابيات: ${r.positives}`, 200, y, { align: 'right', maxWidth: 180 }); y += 15;
        doc.text(`ملاحظات للتحسين: ${r.notesForImprovement}`, 200, y, { align: 'right', maxWidth: 180 }); y += 15;
    }
    return y;
};


export const exportToPdf = (report: Report, teacher: Teacher) => {
    const doc = setupPdfDoc();
    generatePdfForReport(doc, report, teacher, 20);
    addBorderToPdf(doc);
    doc.save(`report_${teacher.name}_${report.date}.pdf`);
};

export const exportToExcel = (report: Report, teacher: Teacher) => {
    const data: any[] = [];
    data.push(["المعلم", teacher.name]);
    data.push(["التاريخ", new Date(report.date).toLocaleDateString()]);
    if (report.academicYear) data.push(["العام الدراسي", report.academicYear]);
    data.push(["المدرسة", report.school]);
    if(report.supervisorName) data.push(["المشرف", report.supervisorName]);
    if(report.semester) data.push(["الفصل الدراسي", report.semester]);
    data.push(["المادة", report.subject]);
    data.push(["الصفوف", report.grades]);
    data.push([]); // Spacer

    data.push(['بطاقة معلومات المعلم']); // Header for the section
    data.push(['المؤهل الدراسي', teacher.qualification || '']);
    data.push(['التخصص', teacher.specialization || '']);
    data.push(['المواد التي يدرسها', teacher.subjects || '']);
    data.push(['الصفوف التي يدرسها', teacher.gradesTaught || '']);
    data.push(['الشعب التي يدرسها', teacher.sectionsTaught || '']);
    data.push(['نصاب الحصص الأسبوعي', teacher.weeklyHours || '']);
    data.push(['سنوات الخبرة', teacher.yearsOfExperience || '']);
    data.push(['سنوات العمل في المدرسة', teacher.yearsInSchool || '']);
    data.push(['رقم الهاتف', teacher.phoneNumber || '']);
    data.push([]); // Spacer

    if (report.evaluationType === 'general') {
        const r = report as GeneralEvaluationReport;
        data.push(["نوع التقييم", "تقييم عام"]);
        data.push([]);
        data.push(["المعيار", "الدرجة", "النسبة"]);
        r.criteria.forEach(c => {
            data.push([c.label, c.score, `${getScorePercentage(c.score, 4).toFixed(0)}%`]);
        });
        data.push([]);
        data.push(["النسبة النهائية", `${calculateReportPercentage(r).toFixed(2)}%`]);
        data.push([]);
        data.push(["الاستراتيجيات", r.strategies]);
        data.push(["الوسائل", r.tools]);
        data.push(["البرامج", r.programs]);
        data.push(["المصادر", r.sources]);
    } else if (report.evaluationType === 'class_session') {
        const r = report as ClassSessionEvaluationReport;
        data.push(["نوع التقييم", `تقييم حصة دراسية (${r.subType})`]);
        data.push(["نوع الزيارة", r.visitType], ["الصف", `${r.class} / ${r.section}`], ["عنوان الدرس", r.lessonName]);
        data.push([]);
         r.criterionGroups.forEach(group => {
            data.push([group.title, "الدرجة"]);
            group.criteria.forEach(c => {
                data.push([`  - ${c.label}`, c.score]);
            });
        });
        data.push([]);
        data.push(["النسبة النهائية", `${calculateReportPercentage(r).toFixed(2)}%`]);
        data.push([]);
        data.push(["الاستراتيجيات", r.strategies]);
        data.push(["الوسائل", r.tools]);
        data.push(["المصادر", r.sources]);
        data.push(["البرامج", r.programs]);
        data.push([]);
        data.push(["الإيجابيات", r.positives]);
        data.push(["ملاحظات للتحسين", r.notesForImprovement]);
        data.push(["التوصيات", r.recommendations]);
        data.push(["تعليق الموظف", r.employeeComment]);
    } else if (report.evaluationType === 'special') {
        const r = report as SpecialReport;
        data.push(["نوع التقييم", `تقرير خاص: ${r.templateName}`]);
        data.push([]);
        data.push(["المعيار", "الدرجة", "النسبة"]);
        r.criteria.forEach(c => {
            data.push([c.label, c.score, `${getScorePercentage(c.score, 4).toFixed(0)}%`]);
        });
        data.push([]);
        data.push(["النسبة النهائية", `${calculateReportPercentage(r).toFixed(2)}%`]);
    }


    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `report_${teacher.name}_${report.date}.xlsx`);
};


export const sendToWhatsApp = (report: Report, teacher: Teacher) => {
    const content = generateTextContent(report, teacher);
    const phone = teacher.phoneNumber ? teacher.phoneNumber.replace(/[^0-9]/g, '') : '';
    let whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`;
    if (phone) {
      whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(content)}`;
    }
    window.open(whatsappUrl, '_blank');
};

// --- AGGREGATED REPORTS EXPORT ---

const generateAggregatedText = (reports: Report[], teachers: Teacher[]): string => {
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    let fullContent = "--- تقارير مجمعة ---\n\n";
    reports.forEach(report => {
        const teacher = teacherMap.get(report.teacherId);
        if (teacher) {
            fullContent += generateTextContent(report, teacher).replace(/\*/g, '').replace(/[👤📅🏫📖👨‍🏫🏢💡🔧💻🧑‍🏫🗓️🔎📘📌📊👍📝🎯✍️🎓]/g, '');
            fullContent += "\n================================\n\n";
        }
    });
    return fullContent;
};

export const exportAggregatedToTxt = (reports: Report[], teachers: Teacher[]) => {
    const content = generateAggregatedText(reports, teachers);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aggregated_reports_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
};

export const exportAggregatedToPdf = (reports: Report[], teachers: Teacher[]) => {
    const doc = setupPdfDoc();
    const teacherObjMap = new Map(teachers.map(t => [t.id, t]));
    let y = 20;

    reports.forEach((report, index) => {
        const teacher = teacherObjMap.get(report.teacherId);
        if (teacher) {
            if (index > 0) doc.addPage();
            y = 20;
            y = generatePdfForReport(doc, report, teacher, y);
        }
    });
    addBorderToPdf(doc);
    doc.save(`aggregated_reports_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportAggregatedToExcel = (reports: Report[], teachers: Teacher[]) => {
    const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
    const data = reports.map(r => {
        let type = '';
        if (r.evaluationType === 'general') type = 'عام';
        else if (r.evaluationType === 'class_session') type = 'حصة دراسية';
        else if (r.evaluationType === 'special') type = r.templateName;

        return {
            "المعلم": teacherMap.get(r.teacherId) || 'غير معروف',
            "التاريخ": new Date(r.date).toLocaleDateString(),
            "العام الدراسي": r.academicYear || '',
            "المدرسة": r.school,
            "نوع التقييم": type,
            "النسبة المئوية": calculateReportPercentage(r).toFixed(2) + '%'
        };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aggregated Reports");
    XLSX.writeFile(wb, `aggregated_reports_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const sendAggregatedToWhatsApp = (reports: Report[], teachers: Teacher[]) => {
    const content = generateAggregatedText(reports, teachers);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`;
    window.open(whatsappUrl, '_blank');
};


// --- NEW: TASK PLAN EXPORT ---

const generateTasksText = (tasks: Task[], academicYear?: string): string => {
    let content = `*📋 تقرير خطة المهام*\n`;
    if (academicYear) content += `*🎓 العام الدراسي:* ${academicYear}\n`;
    content += `*تاريخ:* ${new Date().toLocaleDateString()}\n`;
    content += SEPARATOR;
    tasks.forEach(task => {
        content += `*📝 المهمة:* ${task.description}\n`;
        content += `*🏷️ النوع:* ${task.type}\n`;
        content += `*📅 تاريخ الاستحقاق:* ${task.dueDate || 'غير محدد'}\n`;
        content += `*📊 الحالة:* ${task.status} (${task.completionPercentage}%)\n`;
        if (task.notes) content += `*💬 ملاحظات:* ${task.notes}\n`;
        if (task.isOffPlan) content += `*✨ (عمل خارج الخطة)*\n`;
        content += `-----------------\n`;
    });
    return content;
};

export const exportTasks = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', tasks: Task[], academicYear?: string) => {
    const filename = `task_plan_${new Date().toISOString().split('T')[0]}`;
    const textContent = generateTasksText(tasks, academicYear);
    
    if (format === 'txt') {
        const blob = new Blob([textContent.replace(/\*/g, '')], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.txt`;
        link.click();
    } else if (format === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textContent)}`, '_blank');
    } else if (format === 'pdf') {
        const doc = setupPdfDoc();
        let y = 20;
        doc.text('تقرير خطة المهام', 200, y, { align: 'right' }); y += 7;
        if(academicYear) { doc.text(`العام الدراسي: ${academicYear}`, 200, y, {align: 'right'}); y += 10; }

        doc.autoTable({
            startY: y,
            head: [['ملاحظات', 'نسبة الإنجاز', 'الحالة', 'التاريخ', 'النوع', 'المهمة']],
            body: tasks.map(t => [t.notes || '', `%${t.completionPercentage}`, t.status, t.dueDate, t.type, t.description]),
            styles: getTableStyles(), headStyles: getHeadStyles()
        });
        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);
    } else if (format === 'excel') {
        const data = tasks.map(t => ({
            'المهمة': t.description,
            'النوع': t.type,
            'تاريخ الاستحقاق': t.dueDate,
            'الحالة': t.status,
            'نسبة الإنجاز': t.completionPercentage,
            'ملاحظات': t.notes,
            'خارج الخطة': t.isOffPlan ? 'نعم' : 'لا'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Task Plan");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};


// --- NEW: MEETING MINUTES EXPORT ---
const generateMeetingText = (meeting: Meeting): string => {
    let content = `*📋 محضر اجتماع*\n`;
    if (meeting.academicYear) content += `*🎓 العام الدراسي:* ${meeting.academicYear}\n`;
    content += `*تاريخ:* ${meeting.date} | *الوقت:* ${meeting.time}\n`;
    content += `*المجتمع بهم:* ${meeting.subject}\n`;
    content += SEPARATOR;
    content += "*المخرجات:*\n";
    meeting.outcomes.forEach(o => {
        let statusText = o.status;
        if (o.status === 'تم التنفيذ' && o.completionPercentage) {
            statusText += ` (بنسبة ${o.completionPercentage}%)`;
        }
        content += `- ${o.outcome} (المنفذ: ${o.assignee}, الموعد: ${o.deadline}, الحالة: ${statusText})\n`;
        if (o.notes) content += `  *ملاحظات:* ${o.notes}\n`;
    });
    content += SEPARATOR;
    content += `*الحضور:*\n${meeting.attendees}\n`;
    return content;
}

export const exportMeeting = (args: { format: 'txt' | 'pdf' | 'excel' | 'whatsapp', meeting: Meeting, academicYear?: string }) => {
    const { format, meeting } = args;
    const filename = `meeting_${meeting.date}`;
    const textContent = generateMeetingText(meeting);

    if (format === 'txt') {
         const blob = new Blob([textContent.replace(/\*/g, '')], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.txt`;
        link.click();
    }
    else if (format === 'whatsapp') { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textContent)}`, '_blank'); }
    else if (format === 'pdf') {
        const doc = setupPdfDoc();
        let y = 20;
        const writeRtl = (text: string, yPos: number, maxWidth = 180) => doc.text(text, 200, yPos, { align: 'right', maxWidth });

        writeRtl('محضر اجتماع', y); y += 7;
        if(meeting.academicYear) { writeRtl(`العام الدراسي: ${meeting.academicYear}`, y); y += 7; }
        writeRtl(`التاريخ: ${meeting.date} | الوقت: ${meeting.time}`, y); y += 7;
        writeRtl(`المجتمع بهم: ${meeting.subject}`, y); y += 10;

        doc.autoTable({
            startY: y,
            head: [['ملاحظات', 'النسبة', 'الحالة', 'الموعد', 'المنفذ', 'المخرج']],
            body: meeting.outcomes.filter(o => o.outcome).map(o => [
                o.notes || '',
                o.status === 'تم التنفيذ' ? `%${o.completionPercentage}` : '-',
                o.status,
                o.deadline,
                o.assignee,
                o.outcome
            ]),
            styles: getTableStyles(), headStyles: getHeadStyles()
        });
        y = doc.lastAutoTable.finalY + 10;

        writeRtl('الحضور:', y); y += 7;
        writeRtl(meeting.attendees, y); y += 15;
        
        writeRtl('التوقيعات:', y); y += 7;
        Object.entries(meeting.signatures).forEach(([name, sig]) => {
             writeRtl(`${name}: ${sig}`, y); y += 7;
        })

        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);
    } else if (format === 'excel') { 
        const wb = XLSX.utils.book_new();
        const mainInfo = [
            ['محضر اجتماع'],
            ['العام الدراسي', meeting.academicYear || ''],
            ['التاريخ', meeting.date],
            ['الوقت', meeting.time],
            ['المجتمع بهم', meeting.subject]
        ];
        const ws = XLSX.utils.aoa_to_sheet(mainInfo);
        
        XLSX.utils.sheet_add_aoa(ws, [['']], { origin: -1 }); // Spacer
        const outcomesHeader = ['المخرج', 'المنفذ', 'الموعد', 'الحالة', 'نسبة الإنجاز', 'ملاحظات'];
        XLSX.utils.sheet_add_aoa(ws, [outcomesHeader], { origin: -1 });

        meeting.outcomes.filter(o => o.outcome).forEach(o => {
            const row = [o.outcome, o.assignee, o.deadline, o.status, o.status === 'تم التنفيذ' ? o.completionPercentage : '', o.notes || ''];
            XLSX.utils.sheet_add_aoa(ws, [row], { origin: -1 });
        });

        XLSX.utils.book_append_sheet(wb, ws, "Meeting Minutes");
        XLSX.writeFile(wb, `${filename}.xlsx`);
     }
}

// --- NEW: MEETING SUMMARY EXPORT ---
export const exportMeetingSummary = (args: { format: 'txt' | 'pdf' | 'excel' | 'whatsapp', stats: any, dateRange: { start: string, end: string }, t: (key: any) => string}) => {
    const { format, stats, dateRange, t } = args;
    const filename = `meeting_summary_${dateRange.start}_to_${dateRange.end}`;
    
    let textContent = `${SEPARATOR}`;
    textContent += `📊 *${t('meetingOutcomesReport')}*\n`;
    textContent += `📅 ${t('from_date')}: ${dateRange.start} | ${t('to_date')}: ${dateRange.end}\n`;
    textContent += `${SEPARATOR}`;
    textContent += `📌 ${t('totalOutcomes')}: ${stats.total}\n`;
    textContent += `✅ ${t('executed')}: ${stats.executed} (${stats.percentages.executed.toFixed(1)}%)\n`;
    textContent += `⏳ ${t('inProgress')}: ${stats.inProgress} (${stats.percentages.inProgress.toFixed(1)}%)\n`;
    textContent += `❌ ${t('notExecuted')}: ${stats.notExecuted} (${stats.percentages.notExecuted.toFixed(1)}%)\n`;

    if (format === 'txt') {
        const blob = new Blob([textContent.replace(/\*/g, '')], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.txt`;
        link.click();
    } else if (format === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textContent)}`, '_blank');
    } else if (format === 'pdf') {
        const doc = setupPdfDoc();
        let y = 20;
        const writeRtl = (text: string, yPos: number) => doc.text(text, 200, yPos, { align: 'right' });

        writeRtl(t('meetingOutcomesReport'), y); y += 7;
        writeRtl(`${t('from_date')}: ${dateRange.start} | ${t('to_date')}: ${dateRange.end}`, y); y += 10;
        
        doc.autoTable({
            startY: y,
            head: [['النسبة', 'العدد', 'الحالة']],
            body: [
                [`${stats.percentages.executed.toFixed(1)}%`, stats.executed, t('executed')],
                [`${stats.percentages.inProgress.toFixed(1)}%`, stats.inProgress, t('inProgress')],
                [`${stats.percentages.notExecuted.toFixed(1)}%`, stats.notExecuted, t('notExecuted')]
            ],
            styles: getTableStyles(), headStyles: getHeadStyles()
        });
        
        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);
    } else if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        const data = [
            [t('meetingOutcomesReport')],
            [t('from_date'), dateRange.start, t('to_date'), dateRange.end],
            [],
            ['الحالة', 'العدد', 'النسبة'],
            [t('executed'), stats.executed, stats.percentages.executed.toFixed(1) + '%'],
            [t('inProgress'), stats.inProgress, stats.percentages.inProgress.toFixed(1) + '%'],
            [t('notExecuted'), stats.notExecuted, stats.percentages.notExecuted.toFixed(1) + '%']
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Summary");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};

// --- NEW: PEER VISITS EXPORT ---
export const exportPeerVisits = (args: { format: 'txt' | 'pdf' | 'excel' | 'whatsapp', visits: PeerVisit[], academicYear?: string }) => {
    const { format, visits, academicYear } = args;
    const filename = `peer_visits_${new Date().toISOString().split('T')[0]}`;
    let textContent = `*🤝 تقرير الزيارات التبادلية*\n`;
    if (academicYear) textContent += `*🎓 العام الدراسي:* ${academicYear}\n`;
    textContent += SEPARATOR;
    visits.forEach(v => {
        textContent += `*المعلم الزائر:* ${v.visitingTeacher} (${v.visitingSubject} - ${v.visitingGrade})\n`;
        textContent += `*المعلم المزور:* ${v.visitedTeacher} (${v.visitedSubject} - ${v.visitedGrade})\n`;
        textContent += `-----------------\n`;
    });
    
    if (format === 'txt') { /* similar to tasks */ }
    else if (format === 'whatsapp') {  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textContent)}`, '_blank'); }
    else if (format === 'pdf') {
        const doc = setupPdfDoc();
        let y = 20;
        doc.text('تقرير الزيارات التبادلية', 200, y, { align: 'right' }); y+= 7;
        if(academicYear) { doc.text(`العام الدراسي: ${academicYear}`, 200, y, {align: 'right'}); y += 10; }
        doc.autoTable({
            startY: y,
            head: [['صف المزور', 'مادة المزور', 'المعلم المزور', 'صف الزائر', 'مادة الزائر', 'المعلم الزائر']],
            body: visits.map(v => [v.visitedGrade, v.visitedSubject, v.visitedTeacher, v.visitingGrade, v.visitingSubject, v.visitingTeacher]),
            styles: getTableStyles(), headStyles: getHeadStyles()
        });
        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);
    } else if (format === 'excel') { /* similar to tasks */ }
};


// --- NEW: DELIVERY RECORDS EXPORT ---
export const exportDeliveryRecords = (args: { format: 'txt' | 'pdf' | 'excel' | 'whatsapp', records: DeliveryRecord[], sheetName: string, academicYear?: string }) => {
    const { format, records, sheetName, academicYear } = args;
    const filename = `${sheetName}_${new Date().toISOString().split('T')[0]}`;
    let textContent = `*📦 تقرير كشف: ${sheetName}*\n`;
    if (academicYear) textContent += `*🎓 العام الدراسي:* ${academicYear}\n`;
    textContent += SEPARATOR;
    records.forEach(r => {
        textContent += `*المعلم:* ${r.teacherName}\n*المادة:* ${r.subject} - ${r.grade}\n`;
        textContent += `*العدد:* ${r.formCount}\n*ت. الاستلام:* ${r.receiveDate}\n*ت. التسليم:* ${r.deliveryDate}\n`;
        textContent += `-----------------\n`;
    });
    
    if (format === 'txt') { /* ... */ }
    else if (format === 'whatsapp') { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textContent)}`, '_blank'); }
    else if (format === 'pdf') {
         const doc = setupPdfDoc();
         let y = 20;
        doc.text(`تقرير كشف: ${sheetName}`, 200, y, { align: 'right' }); y += 7;
        if(academicYear) { doc.text(`العام الدراسي: ${academicYear}`, 200, y, {align: 'right'}); y += 10; }
        doc.autoTable({
            startY: y,
            head: [['ت. التسليم', 'ت. الاستلام', 'العدد', 'المادة', 'الصف', 'المعلم']],
            body: records.map(r => [r.deliveryDate, r.receiveDate, r.formCount, r.subject, r.grade, r.teacherName]),
            styles: getTableStyles(), headStyles: getHeadStyles()
        });
        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);
    } else if (format === 'excel') { /* ... */ }
};

// --- NEW: SYLLABUS PLAN EXPORT ---
export const exportSyllabusPlan = (
    format: 'txt' | 'pdf' | 'excel' | 'whatsapp',
    plan: SyllabusPlan,
    t: (key: any) => string
) => {
    const filename = `syllabus_plan_${plan.subject}_${plan.grade}`;
    
    let content = `*🗓️ ${t('syllabusPlan')}*\n`;
    content += `*📖 ${t('subject')}:* ${plan.subject}\n`;
    content += `*👨‍🏫 ${t('grade')}:* ${plan.grade}\n`;
    content += SEPARATOR;
    
    plan.lessons.forEach(lesson => {
        content += `- *${t('lessonTitle')}:* ${lesson.title}\n`;
        content += `  *${t('plannedDate')}:* ${lesson.plannedDate}\n`;
    });

    if (format === 'txt') {
        const blob = new Blob([content.replace(/\*/g, '')], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.txt`;
        link.click();
    } else if (format === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
    } else if (format === 'pdf') {
        const doc = setupPdfDoc();
        let y = 20;
        const writeRtl = (text: string, yPos: number) => doc.text(text, 200, yPos, { align: 'right' });

        writeRtl(t('syllabusPlan'), y); y += 7;
        writeRtl(`${t('subject')}: ${plan.subject} | ${t('grade')}: ${plan.grade}`, y); y += 10;

        doc.autoTable({
            startY: y,
            head: [[t('plannedDate'), t('lessonTitle')]],
            body: plan.lessons.map(l => [l.plannedDate, l.title]),
            styles: getTableStyles(), headStyles: getHeadStyles()
        });
        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);
    } else if (format === 'excel') {
        const data = plan.lessons.map(l => ({
            [t('lessonTitle')]: l.title,
            [t('plannedDate')]: l.plannedDate,
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Syllabus Plan");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};


// --- NEW: SYLLABUS COVERAGE EXPORT ---
export const exportSyllabusCoverage = (
    format: 'txt' | 'pdf' | 'excel' | 'whatsapp',
    report: SyllabusCoverageReport,
    teacherName: string,
    t: (key: any) => string // Pass translator function for statuses
) => {
    const filename = `syllabus_report_${teacherName}_${report.date}`;

    // Helper to translate status and branch
    const translateStatus = (status: SyllabusBranchProgress['status']) => {
        switch(status) {
            case 'ahead': return t('statusAhead');
            case 'on_track': return t('statusOnTrack');
            case 'behind': return t('statusBehind');
            default: return '--';
        }
    };
    const translateBranch = (branch: SyllabusCoverageReport['branch']) => {
        switch(branch) {
            case 'boys': return t('boysBranch');
            case 'girls': return t('girlsBranch');
            case 'main':
            default: return t('mainBranch');
        }
    };

    if (format === 'txt' || format === 'whatsapp') {
        let content = `*📊 تقرير سير المنهج*\n\n`;
        content += `*--- ℹ️ المعلومات الأساسية ---*\n`;
        content += `*👨‍🏫 المعلم:* ${teacherName}\n`;
        content += `*🏫 المدرسة:* ${report.schoolName} (${translateBranch(report.branch)})\n`;
        content += `*📖 المادة:* ${report.subject} - *الصف:* ${report.grade}\n`;
        content += `*📅 التاريخ:* ${new Date(report.date).toLocaleDateString()} | *الفصل:* ${report.semester}\n`;
        content += `*🎓 العام الدراسي:* ${report.academicYear}\n\n`;
        
        content += `*--- 📈 تفاصيل السير في المنهج ---*\n`;
        
        if (report.branches.length > 0) {
            report.branches.forEach(b => {
                let statusEmoji = '⚪️';
                if (b.status === 'ahead') statusEmoji = '🟢';
                if (b.status === 'on_track') statusEmoji = '🔵';
                if (b.status === 'behind') statusEmoji = '🔴';

                content += `\n*📚 فرع: ${b.branchName}*\n`;
                let statusText = translateStatus(b.status);
                // FIX: Parse lessonDifference to number before comparison.
                if (b.status === 'ahead' && b.lessonDifference && parseInt(b.lessonDifference, 10) > 0) statusText += ` (${b.lessonDifference} دروس)`;
                // FIX: Parse lessonDifference to number before comparison.
                if (b.status === 'behind' && b.lessonDifference && parseInt(b.lessonDifference, 10) > 0) statusText += ` (${b.lessonDifference} دروس)`;
                content += `${statusEmoji} *الحالة:* ${statusText}\n`;
                content += `*✍️ آخر درس:* ${b.lastLesson || 'لم يحدد'}\n`;
                content += `*🔢 النسبة:* ${b.percentage}%\n`;
            });
        } else {
            content += "لا توجد فروع محددة لهذا التقرير.\n";
        }
        
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
            doc.text(text, 200, yPos, { align: 'right' });
        }
        
        writeRtl('تقرير سير المنهج', y, 18, 'bold'); y += 10;
        writeRtl(`المعلم: ${teacherName} | التاريخ: ${new Date(report.date).toLocaleDateString()}`, y); y+= 7;
        writeRtl(`المدرسة: ${report.schoolName} | الفرع: ${translateBranch(report.branch)}`, y); y+= 7;
        writeRtl(`المادة: ${report.subject} | الصف: ${report.grade}`, y); y+= 7;
        writeRtl(`العام الدراسي: ${report.academicYear} | الفصل الدراسي: ${report.semester}`, y); y+= 10;
        
        if (report.branches.length > 0) {
            const head = [['النسبة المئوية', 'آخر درس', 'حالة السير', 'الفرع']];
            const body = report.branches.map(b => {
                let statusText = translateStatus(b.status);
                // FIX: Parse lessonDifference to number before comparison.
                if (b.status === 'ahead' && b.lessonDifference && parseInt(b.lessonDifference, 10) > 0) statusText += ` (${b.lessonDifference} دروس)`;
                // FIX: Parse lessonDifference to number before comparison.
                if (b.status === 'behind' && b.lessonDifference && parseInt(b.lessonDifference, 10) > 0) statusText += ` (${b.lessonDifference} دروس)`;
                return [`%${b.percentage}`, b.lastLesson, statusText, b.branchName];
            });
            
            doc.autoTable({
                startY: y,
                head: head,
                body: body,
                styles: getTableStyles(), headStyles: getHeadStyles(),
                didParseCell: (data: any) => {
                     if (data.section === 'head' || data.section === 'body') {
                        data.cell.styles.halign = 'right';
                     }
                }
            });
        }
        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);

    } else if (format === 'excel') {
        const data: any[][] = [];
        data.push(['تقرير سير المنهج']);
        data.push(['المعلم', teacherName]);
        data.push(['التاريخ', new Date(report.date).toLocaleDateString()]);
        data.push(['المدرسة', report.schoolName]);
        data.push(['الفرع', translateBranch(report.branch)]);
        data.push(['المادة', report.subject]);
        data.push(['الصف', report.grade]);
        data.push(['العام الدراسي', report.academicYear]);
        data.push(['الفصل الدراسي', report.semester]);
        data.push([]); // Spacer

        if (report.branches.length > 0) {
            data.push(['الفرع', 'حالة السير', 'آخر درس', 'النسبة المئوية']);
            report.branches.forEach(b => {
                 let statusText = translateStatus(b.status);
                 // FIX: Parse lessonDifference to number before comparison.
                 if (b.status === 'ahead' && b.lessonDifference && parseInt(b.lessonDifference, 10) > 0) statusText += ` (${b.lessonDifference} دروس)`;
                 // FIX: Parse lessonDifference to number before comparison.
                 if (b.status === 'behind' && b.lessonDifference && parseInt(b.lessonDifference, 10) > 0) statusText += ` (${b.lessonDifference} دروس)`;
                 data.push([b.branchName, statusText, b.lastLesson, `${b.percentage}%`]);
            });
        }
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Syllabus Report");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};

// --- NEW: PERFORMANCE DASHBOARD EXPORT UTILS ---

const openInNewWindow = (content: string, title: string) => {
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(`<html dir="rtl" lang="ar"><head><title>${title}</title><style>body{font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;} h1, h2 { color: #16786d; } pre { white-space: pre-wrap; word-wrap: break-word; background: #f4f4f4; padding: 10px; border-radius: 5px;}</style></head><body><h1>${title}</h1><pre>${content}</pre></body></html>`);
        win.document.close();
    }
}

// --- 1. Key Metrics (Usage Statistics) ---

const generateKeyMetricsText = (stats: any, t: (key: any) => string): string => {
    if (!stats) return t('noDataForPeriod');
    
    let content = `${SEPARATOR}\n`;
    content += `📊 *${t('usageStatistics')}*\n`;
    content += `${SEPARATOR}`;
    content += `📈 *${t('strategiesUsed')}*: ${stats.percentages.strategies.toFixed(1)}%\n`;
    content += `🛠️ *${t('toolsUsed')}*: ${stats.percentages.tools.toFixed(1)}%\n`;
    content += `📚 *${t('sourcesUsed')}*: ${stats.percentages.sources.toFixed(1)}%\n`;
    content += `💻 *${t('programsUsed')}*: ${stats.percentages.programs.toFixed(1)}%\n`;

    const generateCategoryDetails = (categoryTitle: string, itemData: any) => {
        content += `${SEPARATOR}\n`;
        content += `📌 *${categoryTitle}*\n`;
        
        if (Object.keys(itemData).length === 0) {
            content += `   (${t('noDataForPeriod')})\n`;
            return;
        }

        Object.entries(itemData).forEach(([itemName, teachers]) => {
            content += `\n🔸 *${itemName}*\n`;
            Object.entries(teachers as {[name: string]: number}).forEach(([teacherName, count]) => {
                content += `   🔹 ${teacherName}: ${count} مرة\n`;
            });
        });
    };

    generateCategoryDetails(t('strategiesUsed'), stats.details.strategies);
    generateCategoryDetails(t('toolsUsed'), stats.details.tools);
    generateCategoryDetails(t('sourcesUsed'), stats.details.sources);
    generateCategoryDetails(t('programsUsed'), stats.details.programs);
    
    return content;
};

export const exportKeyMetrics = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', stats: any, t: (key: any) => string) => {
    const filename = `key_metrics_${new Date().toISOString().split('T')[0]}`;
    const textContent = generateKeyMetricsText(stats, t);
    
    if (format === 'txt') {
        openInNewWindow(textContent, t('usageStatistics'));
    } else if (format === 'whatsapp') {
        const whatsappContent = textContent;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappContent)}`, '_blank');
    } else if (format === 'pdf') {
        const doc = setupPdfDoc();
        let y = 20;
        doc.text(t('usageStatistics'), 200, y, { align: 'right' }); y += 10;
        
        doc.autoTable({
            startY: y,
            head: [[t('percentage'), t('metric')]],
            body: [
                [`${stats.percentages.strategies.toFixed(1)}%`, t('strategiesUsed')],
                [`${stats.percentages.tools.toFixed(1)}%`, t('toolsUsed')],
                [`${stats.percentages.sources.toFixed(1)}%`, t('sourcesUsed')],
                [`${stats.percentages.programs.toFixed(1)}%`, t('programsUsed')],
            ],
            styles: getTableStyles(), headStyles: getHeadStyles()
        });
        y = doc.lastAutoTable.finalY + 10;

        const addDetailsToPdf = (title: string, data: any) => {
            if(y > 250) { doc.addPage(); y = 20; }
            doc.text(title, 200, y, { align: 'right' }); y += 7;
            
            const body: any[] = [];
            Object.entries(data).forEach(([itemName, teachers]) => {
                body.push([{content: itemName, colSpan: 2, styles: {fontStyle: 'bold', fillColor: [240, 240, 240]}}]);
                Object.entries(teachers as any).forEach(([teacher, count]) => {
                    body.push([count, teacher]);
                });
            });

            if (body.length > 0) {
                doc.autoTable({ 
                    startY: y, 
                    head: [['العدد', 'المعلم / العنصر']], 
                    body, 
                    styles: getTableStyles(), 
                    headStyles: getHeadStyles() 
                });
                y = doc.lastAutoTable.finalY + 10;
            } else {
                doc.text(`(${t('noDataForPeriod')})`, 200, y, { align: 'right', fontSize: 10 }); y += 10;
            }
        };

        addDetailsToPdf(t('strategiesUsed'), stats.details.strategies);
        addDetailsToPdf(t('toolsUsed'), stats.details.tools);
        addDetailsToPdf(t('sourcesUsed'), stats.details.sources);
        addDetailsToPdf(t('programsUsed'), stats.details.programs);

        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);
    } else if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        const summaryData = [
            [t('metric'), t('percentage')],
            [t('strategiesUsed'), stats.percentages.strategies],
            [t('toolsUsed'), stats.percentages.tools],
            [t('sourcesUsed'), stats.percentages.sources],
            [t('programsUsed'), stats.percentages.programs],
        ];
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summaryWs, t('summary'));

        const createSheet = (title: string, data: any) => {
            const sheetData: any[][] = [['العنصر', 'المعلم', 'العدد']];
            Object.entries(data).forEach(([itemName, teachers]) => {
                Object.entries(teachers as any).forEach(([teacher, count]) => {
                    sheetData.push([itemName, teacher, count]);
                });
            });
            const ws = XLSX.utils.aoa_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 30));
        };

        createSheet(t('strategiesUsed'), stats.details.strategies);
        createSheet(t('toolsUsed'), stats.details.tools);
        createSheet(t('sourcesUsed'), stats.details.sources);
        createSheet(t('programsUsed'), stats.details.programs);
        
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};

// --- 2. Evaluation Analysis ---
const generateEvalAnalysisText = (analysis: any, t: (key: any) => string): string => {
    if (!analysis) return 'No data.';
    let content = `${SEPARATOR}\n`;
    content += `📊 *${t('evaluationElementAnalysis')}*\n`;
    content += `📝 *${analysis.title}*\n`;
    content += `${SEPARATOR}`;

    const generateLevelText = (levelTitle: string, criteria: any[]) => {
        if(criteria.length === 0) return;
        content += `\n📌 *${levelTitle}*\n`;
        criteria.forEach(c => {
            content += `\n🔸 *${c.label}* (${t('overallAverage')}: ${c.overallAverage.toFixed(1)}%)\n`;
            c.teacherAvgs.forEach((ta: any) => {
                const icon = ta.avg >= 90 ? '🌟' : ta.avg >= 75 ? '✅' : ta.avg >= 50 ? '⚠️' : '❌';
                content += `   🔹 ${ta.name}: ${icon} ${ta.avg.toFixed(1)}%\n`;
            });
        });
        content += `\n----------------\n`;
    };

    generateLevelText(t('performanceLevelExcellent'), analysis.excellent);
    generateLevelText(t('performanceLevelGood'), analysis.good);
    generateLevelText(t('performanceLevelAverage'), analysis.average);
    generateLevelText(t('performanceLevelNeedsImprovement'), analysis.needsImprovement);

    return content;
};

export const exportEvaluationAnalysis = (format: 'txt' | 'pdf' | 'excel' | 'whatsapp', analysis: any, t: (key: any) => string) => {
    const filename = `evaluation_analysis_${analysis.title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const textContent = generateEvalAnalysisText(analysis, t);

    if (format === 'txt') {
        openInNewWindow(textContent, analysis.title);
    } else if (format === 'whatsapp') {
         window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textContent)}`, '_blank');
    } else if (format === 'pdf') {
        const doc = setupPdfDoc();
        let y = 20;
        doc.text(analysis.title, 200, y, { align: 'right' }); y += 10;
        
        const addLevelToPdf = (levelTitle: string, criteria: any[]) => {
            if (criteria.length === 0) return;
            if(y > 250) { doc.addPage(); y = 20; }
            doc.text(levelTitle, 200, y, { align: 'right', fontStyle: 'bold' }); y += 7;
            criteria.forEach(c => {
                 if(y > 270) { doc.addPage(); y = 20; }
                 doc.autoTable({
                     startY: y,
                     head: [[`${c.overallAverage.toFixed(1)}%`, c.label]],
                     body: c.teacherAvgs.map((ta: any) => [`${ta.avg.toFixed(1)}%`, ta.name]),
                     styles: getTableStyles(), headStyles: getHeadStyles()
                 });
                 y = doc.lastAutoTable.finalY + 5;
            });
            y += 5;
        };

        addLevelToPdf(t('performanceLevelExcellent'), analysis.excellent);
        addLevelToPdf(t('performanceLevelGood'), analysis.good);
        addLevelToPdf(t('performanceLevelAverage'), analysis.average);
        addLevelToPdf(t('performanceLevelNeedsImprovement'), analysis.needsImprovement);

        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);
    } else if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        const allCriteria = [...analysis.excellent, ...analysis.good, ...analysis.average, ...analysis.needsImprovement];
        const teachers = [...new Set(allCriteria.flatMap((c:any) => c.teacherAvgs.map((ta:any) => ta.name)))];
        const sheetData = [
            ['المعيار', 'المتوسط العام', ...teachers]
        ];
        allCriteria.forEach((c:any) => {
            const row: any[] = [c.label, c.overallAverage.toFixed(1)];
            teachers.forEach(teacher => {
                const teacherAvg = c.teacherAvgs.find((ta:any) => ta.name === teacher);
                row.push(teacherAvg ? teacherAvg.avg.toFixed(1) : '-');
            });
            sheetData.push(row);
        });
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, analysis.title.substring(0,30));
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};

// --- 3. Supervisory Reports Summaries ---

const generateSupervisoryReportText = (title: string, data: any[], t: (key: any) => string): string => {
    let content = `${SEPARATOR}\n`;
    content += `📊 *${title}*\n`;
    content += `${SEPARATOR}`;
    content += data.join('\n');
    return content;
};

export const exportSupervisorySummary = (args: { format: 'txt' | 'pdf' | 'excel' | 'whatsapp', title: string, data: any[], t: (key: any) => string }) => {
    const { format, title, data, t } = args;
    const filename = `${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const textContent = generateSupervisoryReportText(title, data, t);

    if (format === 'txt') {
        openInNewWindow(textContent, title);
    } else if (format === 'whatsapp') {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textContent)}`, '_blank');
    } else if (format === 'pdf') {
        const doc = setupPdfDoc();
        let y = 20;
        doc.text(title, 200, y, { align: 'right' }); y += 10;
        doc.text(data.join('\n'), 200, y, { align: 'right', maxWidth: 180 });
        addBorderToPdf(doc);
        doc.save(`${filename}.pdf`);
    } else if (format === 'excel') {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data.map(row => [row]));
        XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 30));
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};


// --- NEW: SUPERVISORY PLAN EXPORT (Overhauled) ---
const generateSupervisoryPlanText = (plan: SupervisoryPlanWrapper, selectedMonths?: string[]): string => {
    const dynamicTitle = `خطة الإشراف التربوي للفصل الدراسي ${plan.semester} للعام ${plan.academicYear}`;
    let content = `*${dynamicTitle}*\n`;
    content += `*إعداد المشرف التربوي:* ${plan.supervisorName}\n`;
    content += `*تاريخ الإنشاء:* ${new Date(plan.createdAt).toLocaleDateString()}\n`;
    
    // Off-Plan Activities
    if (plan.offPlanItems && plan.offPlanItems.length > 0) {
        content += SEPARATOR + `*--- أولاً: أنشطة خارج الخطة ---*\n`;
        plan.offPlanItems.forEach((item, i) => {
            content += `${i+1}. *النشاط:* ${item.activity} | *المجال:* ${item.domain}\n   *السبب:* ${item.reason} | *ملاحظات:* ${item.notes}\n`;
        });
    }

    // Strengths
    if (plan.strengthItems && plan.strengthItems.length > 0) {
        content += SEPARATOR + `*--- ثانياً: نقاط القوة وآلية تعزيزها ---*\n`;
        plan.strengthItems.forEach((item, i) => {
            content += `${i+1}. *نقطة القوة:* ${item.strength}\n   *آلية التعزيز:* ${item.reinforcement} | *ملاحظات:* ${item.notes}\n`;
        });
    }

    // Problems
    if (plan.problemItems && plan.problemItems.length > 0) {
        content += SEPARATOR + `*--- ثالثاً: أبرز المشكلات وكيف تم التغلب عليها ---*\n`;
        plan.problemItems.forEach((item, i) => {
            content += `${i+1}. *المشكلة:* ${item.problem}\n   *التعامل معها:* ${item.solution} | *ملاحظات:* ${item.notes}\n`;
        });
    }

    // Recommendations
    if (plan.recommendationItems && plan.recommendationItems.length > 0) {
        content += SEPARATOR + `*--- رابعاً: التوصيات والمقترحات ---*\n`;
        plan.recommendationItems.forEach((item, i) => {
            content += `${i+1}. ${item.recommendation}\n`;
        });
    }

    content += SEPARATOR + `*--- خامساً: خطة الإشراف ومؤشرات الأداء ---*\n`;

    // Filter Logic for text export
    const rowsToInclude = plan.planData.filter(entry => {
        if (entry.isSummaryRow || entry.isGroupHeader) return true;
        // If no months selected, include all.
        if (!selectedMonths || selectedMonths.length === 0) return true;
        // Otherwise, include only if there is a value in one of the selected months.
        return selectedMonths.some(month => {
            const val = (entry.monthlyPlanned as any)[month];
            return val && val !== '0' && val !== '';
        });
    });

    rowsToInclude.forEach(entry => {
        if (entry.isSummaryRow || entry.isGroupHeader) {
            content += `\n--- ${entry.domain} ---\n`;
        } else {
            content += `\n*النشاط:* ${entry.activityText}\n`;
            // Only show planned for selected months if filtering is active? 
            // Usually text export is summary, let's keep it simple: just show total executed vs planned for context if needed, 
            // but the prompt implies filtering rows.
            content += `  *المخطط:* ${entry.activityPlanned} | *المنفذ:* ${entry.executed}\n`;
        }
    });
    return content;
};

export const exportSupervisoryPlan = (
    format: 'txt' | 'pdf' | 'excel' | 'whatsapp',
    plan: SupervisoryPlanWrapper,
    headers: any,
    t: (key: any) => string,
    selectedMonths: string[] = [] // New parameter for filtering
) => {
    const filename = `supervisory_plan_${plan.academicYear.replace(/[\/\s]/g, '_')}`;

    // Filter Logic for all formats
    const rowsToExport = plan.planData.filter(entry => {
        if (entry.isSummaryRow || entry.isGroupHeader) return true;
        if (!selectedMonths || selectedMonths.length === 0) return true;
        return selectedMonths.some(month => {
            const val = (entry.monthlyPlanned as any)[month];
            return val && val !== '0' && val !== '';
        });
    });

    if (format === 'txt' || format === 'whatsapp') {
        const content = generateSupervisoryPlanText(plan, selectedMonths);
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
        const doc = setupPdfDoc("landscape");
        const dynamicTitle = `خطة الإشراف التربوي للفصل الدراسي ${plan.semester} للعام ${plan.academicYear}`;
        
        let yPos = 15;
        doc.text(dynamicTitle, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
        yPos += 7;
        doc.text(`إعداد: ${plan.supervisorName}`, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
        yPos += 15;

        // Helper for tables in PDF
        const addSectionTable = (title: string, head: any[][], body: any[][]) => {
            doc.setFontSize(14);
            doc.text(title, 280, yPos, { align: 'right' });
            yPos += 5;
            doc.autoTable({
                startY: yPos,
                head: head,
                body: body,
                styles: { font: 'Amiri', halign: 'right', fontSize: 10 },
                headStyles: getHeadStyles(),
                margin: { right: 10, left: 10 }
            });
            yPos = doc.lastAutoTable.finalY + 15;
            // Add page if needed
            if (yPos > 180) {
                doc.addPage();
                yPos = 20;
            }
        };

        // 1. Off-Plan
        if (plan.offPlanItems && plan.offPlanItems.length > 0) {
            const body = plan.offPlanItems.map((item, i) => [item.notes, item.reason, item.activity, item.domain, i + 1]);
            addSectionTable("أولاً: أنشطة خارج الخطة", [['ملاحظات', 'أسباب التنفيذ', 'النشاط', 'المجال', 'م']], body);
        }

        // 2. Strengths
        if (plan.strengthItems && plan.strengthItems.length > 0) {
            const body = plan.strengthItems.map((item, i) => [item.notes, item.reinforcement, item.strength, i + 1]);
            addSectionTable("ثانياً: نقاط القوة وآلية تعزيزها", [['ملاحظات', 'آلية تعزيزها', 'نقاط القوة', 'م']], body);
        }

        // 3. Problems
        if (plan.problemItems && plan.problemItems.length > 0) {
            const body = plan.problemItems.map((item, i) => [item.notes, item.solution, item.problem, i + 1]);
            addSectionTable("ثالثاً: أبرز المشكلات وكيف تم التغلب عليها", [['ملاحظات', 'التعامل معها', 'المشكلة', 'م']], body);
        }

        // 4. Recommendations
        if (plan.recommendationItems && plan.recommendationItems.length > 0) {
            const body = plan.recommendationItems.map((item, i) => [item.recommendation, i + 1]);
            addSectionTable("رابعاً: التوصيات والمقترحات", [['التوصيات والمقترحات', 'م']], body);
        }

        doc.setFontSize(14);
        doc.text("خامساً: خطة الإشراف ومؤشرات الأداء", 280, yPos, { align: 'right' });
        yPos += 5;

        const monthKeys = ["dhu_al_hijjah", "muharram", "safar", "rabi_al_awwal", "rabi_al_thani", "jumada_al_ula", "jumada_al_thani", "rajab", "shaban"];
        const monthNames = ["ذو الحجة", "محرم", "صفر", "ربيع الاول", "ربيع الأخر", "جمادى الاولى", "جمادى الأخر", "رجب", "شعبان"];

        const head = [
            [
                { content: headers.domain, rowSpan: 2 }, { content: headers.objective, rowSpan: 2 },
                { content: headers.indicator, colSpan: 3, styles: { halign: 'center' } },
                { content: headers.activity, colSpan: 2, styles: { halign: 'center' } },
                { content: 'التوزيع الزمني', colSpan: monthKeys.length, styles: { halign: 'center' } },
                { content: headers.executed, rowSpan: 2 }, { content: headers.cost, rowSpan: 2 },
                { content: headers.reasonsForNonExecution, rowSpan: 2 }, { content: headers.notes, rowSpan: 2 },
            ],
            [
                headers.indicatorText, headers.indicatorCount, headers.evidence, // Sub-headers for Indicator
                headers.activityText, headers.activityPlanned, // Sub-headers for Activity
                ...monthNames, // Month names
            ]
        ];
        
        // Use rowsToExport instead of full planData
        const body = rowsToExport.map(entry => [
            entry.domain, entry.objective,
            entry.indicatorText, entry.indicatorCount, entry.evidence,
            entry.activityText, entry.activityPlanned,
            ...monthKeys.map(month => (entry.monthlyPlanned as any)[month] || ''),
            entry.executed, entry.cost, entry.reasonsForNonExecution, entry.notes
        ]);

        doc.autoTable({
            startY: yPos, head: head, body: body,
            styles: { font: 'Amiri', halign: 'right', fontSize: 8, cellPadding: 1 },
            headStyles: { ...getHeadStyles(), fontSize: 9, halign: 'center' },
            bodyStyles: { minCellHeight: 10 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        });
        
        doc.save(`${filename}.pdf`);

    } else if (format === 'excel') {
        const data: (string|number)[][] = [];
        const dynamicTitle = `خطة الإشراف التربوي للفصل الدراسي ${plan.semester} للعام ${plan.academicYear}`;
        data.push([dynamicTitle]);
        data.push([`إعداد: ${plan.supervisorName}`]);
        data.push([]);

        // Helper for Excel Tables
        const addExcelSection = (title: string, headers: string[], rows: any[][]) => {
            data.push([title]);
            data.push(headers);
            rows.forEach(row => data.push(row));
            data.push([]); // Spacer
        };

        // 1. Off-Plan
        if (plan.offPlanItems && plan.offPlanItems.length > 0) {
            addExcelSection("أولاً: أنشطة خارج الخطة", ['م', 'المجال', 'النشاط', 'أسباب التنفيذ', 'ملاحظات'], 
                plan.offPlanItems.map((item, i) => [i + 1, item.domain, item.activity, item.reason, item.notes]));
        }

        // 2. Strengths
        if (plan.strengthItems && plan.strengthItems.length > 0) {
            addExcelSection("ثانياً: نقاط القوة وآلية تعزيزها", ['م', 'نقاط القوة', 'آلية تعزيزها', 'ملاحظات'], 
                plan.strengthItems.map((item, i) => [i + 1, item.strength, item.reinforcement, item.notes]));
        }

        // 3. Problems
        if (plan.problemItems && plan.problemItems.length > 0) {
            addExcelSection("ثالثاً: أبرز المشكلات وكيف تم التغلب عليها", ['م', 'المشكلة', 'التعامل معها', 'ملاحظات'], 
                plan.problemItems.map((item, i) => [i + 1, item.problem, item.solution, item.notes]));
        }

        // 4. Recommendations
        if (plan.recommendationItems && plan.recommendationItems.length > 0) {
            addExcelSection("رابعاً: التوصيات والمقترحات", ['م', 'التوصيات والمقترحات'], 
                plan.recommendationItems.map((item, i) => [i + 1, item.recommendation]));
        }

        data.push(["خامساً: خطة الإشراف ومؤشرات الأداء"]);

        const head1 = [
            headers.domain, headers.objective, headers.indicator, '', '', headers.activity, '',
            'التوزيع الزمني', ...Array(8).fill(''),
            headers.executed, headers.cost, headers.reasonsForNonExecution, headers.notes
        ];
        const head2 = [
            '', '', headers.indicatorText, headers.indicatorCount, headers.evidence,
            headers.activityText, headers.activityPlanned,
            "ذو الحجة", "محرم", "صفر", "ربيع الاول", "ربيع الأخر", "جمادى الاولى", "جمادى الأخر", "رجب", "شعبان",
            '', '', '', ''
        ];
        
        data.push(head1);
        data.push(head2);

        const monthKeys = ["dhu_al_hijjah", "muharram", "safar", "rabi_al_awwal", "rabi_al_thani", "jumada_al_ula", "jumada_al_thani", "rajab", "shaban"];
        // Use rowsToExport
        rowsToExport.forEach(entry => {
            data.push([
                entry.domain, entry.objective,
                entry.indicatorText || '', entry.indicatorCount || '', entry.evidence || '',
                entry.activityText || '', entry.activityPlanned || '',
                ...monthKeys.map(month => (entry.monthlyPlanned as any)[month] || ''),
                entry.executed, entry.cost, entry.reasonsForNonExecution, entry.notes
            ]);
        });
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Calculate where the main plan starts for merging logic
        // This is complex to calculate dynamically for merging. 
        // Simple approach: Find the row index where "خامساً..." is located.
        const mainPlanStartRow = data.findIndex(row => row[0] === "خامساً: خطة الإشراف ومؤشرات الأداء");
        
        if (mainPlanStartRow !== -1) {
            const headerRowIndex = mainPlanStartRow + 1; // head1 starts after title

            if(!ws['!merges']) ws['!merges'] = [];
            // Merging header cells (dynamically calculate row indices)
            const r1 = headerRowIndex;
            const r2 = headerRowIndex + 1;

            ws['!merges'].push({ s: { r: r1, c: 0 }, e: { r: r2, c: 0 } }); // Domain
            ws['!merges'].push({ s: { r: r1, c: 1 }, e: { r: r2, c: 1 } }); // Objective
            ws['!merges'].push({ s: { r: r1, c: 2 }, e: { r: r1, c: 4 } }); // Indicator (main)
            ws['!merges'].push({ s: { r: r1, c: 5 }, e: { r: r1, c: 6 } }); // Activity (main)
            ws['!merges'].push({ s: { r: r1, c: 7 }, e: { r: r1, c: 15 } }); // Months (main)
            ws['!merges'].push({ s: { r: r1, c: 16 }, e: { r: r2, c: 16 } }); // Executed
            ws['!merges'].push({ s: { r: r1, c: 17 }, e: { r: r2, c: 17 } }); // Cost
            ws['!merges'].push({ s: { r: r1, c: 18 }, e: { r: r2, c: 18 } }); // Reasons
            ws['!merges'].push({ s: { r: r1, c: 19 }, e: { r: r2, c: 19 } }); // Notes
        }
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Supervisory Plan");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    }
};