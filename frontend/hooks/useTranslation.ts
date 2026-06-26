// Simple translation wrapper for quick integration
import { useLanguage } from '../contexts/LanguageContext';
import { translateApplicationStatus } from '../utils/applicationStatus';

export const useTranslation = () => {
    const { t, dir, language } = useLanguage();

    const translateStatus = (status: string) => translateApplicationStatus(status, language);

    // Helper function to translate degree
    const translateDegree = (degree: string) => {
        const degreeMap: Record<string, any> = {
            'Bachelor': t.bachelor,
            'بكالوريوس': t.bachelor,
            'Master': t.master,
            'ماجستير': t.master,
            'PhD': t.phd,
            'دكتوراه': t.phd,
            'Diploma': t.associateDegree,
            'CombinedPhD': t.combinedPhd,
        };
        return degreeMap[degree] || degree;
    };

    const translateCategory = (category: string) => {
        const categoryMap: Record<string, string> = {
            'medicine_health_sciences': t.category_medicine_health_sciences,
            'engineering_technology': t.category_engineering_technology,
            'natural_sciences': t.category_natural_sciences,
            'social_economic_admin_sciences': t.category_social_economic_admin_sciences,
            'education_teaching': t.category_education_teaching,
            'law_communication_humanities': t.category_law_communication_humanities,
            'art_design_sports': t.category_art_design_sports,
        };
        return categoryMap[category] || category;
    };

    // Helper function to translate gender
    const translateGender = (gender: string) => {
        const genderMap: Record<string, any> = {
            'Male': t.male,
            'ذكر': t.male,
            'Female': t.female,
            'أنثى': t.female,
        };
        return genderMap[gender] || gender;
    };

    // Helper function to translate role
    const translateRole = (role: string) => {
        const roleMap: Record<string, any> = {
            'ADMIN': t.admin,
            'Admin': t.admin,
            'AGENT': t.agent,
            'Agent': t.agent,
            'USER': t.user,
            'User': t.user,
        };
        return roleMap[role] || role;
    };

    const translateNotification = (n: { type: string; title: string; message: string }) => {
        if (n.type === 'FILE_UPLOAD' || (n.type === 'STATUS' && n.message.includes('uploaded file(s)'))) {
            const studentMatch = n.message.match(/Agent (.+?) uploaded file\(s\) for student (.+?)\./);
            if (studentMatch) {
                return {
                    title: t.fileUploadStudentTitle,
                    message: t.fileUploadStudentMessage
                        .replace('{agent}', studentMatch[1])
                        .replace('{student}', studentMatch[2])
                };
            }
            const appMatch = n.message.match(/Agent (.+?) uploaded file\(s\) to application #(.+?)\./);
            if (appMatch) {
                return {
                    title: t.fileUploadApplicationTitle,
                    message: t.fileUploadApplicationMessage
                        .replace('{agent}', appMatch[1])
                        .replace('{id}', appMatch[2])
                };
            }
            return { title: n.title, message: n.message };
        }

        if (n.type === 'STATUS' && /status changed to/i.test(n.message)) {
            const idMatch = n.message.match(/#([A-Za-z0-9-]+)/);
            const id = idMatch ? idMatch[1] : '';
            // Try to extract status - it's at the end
            const statusMatch = n.message.match(/changed to (.+)$/);
            const rawStatus = statusMatch ? statusMatch[1] : '';
            const translatedStatus = translateStatus(rawStatus);

            return {
                title: t.statusUpdate,
                message: t.statusUpdateMessage.replace('{id}', id).replace('{status}', translatedStatus)
            };
        }

        if (n.type === 'MESSAGE') {
            if (n.message.startsWith('Admin:')) {
                const msgContent = n.message.replace('Admin:', '').trim();
                return {
                    title: t.newMessage,
                    message: t.messageFromAdmin.replace('{message}', msgContent)
                };
            }
            if (n.message.startsWith('App #')) {
                const idMatch = n.message.match(/#([A-Za-z0-9-]+)/);
                const id = idMatch ? idMatch[1] : '';
                const msgContent = n.message.split(':').slice(1).join(':').trim();
                return {
                    title: t.newMessage,
                    message: t.messageFromApp.replace('{id}', id).replace('{message}', msgContent)
                };
            }
        }

        return { title: n.title, message: n.message };
    };

    return {
        t,
        dir,
        language,
        translateStatus,
        translateDegree,
        translateCategory,
        translateGender,
        translateRole,
        translateNotification,
    };
};
