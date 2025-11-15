import React, { useState, useEffect } from 'react';
import { User, Teacher, Permission } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { PERMISSIONS_HIERARCHY } from '../constants';

interface UserDetailsModalProps {
    user: User;
    allTeachers: Teacher[];
    onSave: (user: User) => void;
    onCancel: () => void;
    generateCode: () => Promise<string>;
    isGeneratingCode: boolean;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, allTeachers, onSave, onCancel, generateCode, isGeneratingCode }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState<User>(user);
    const isNewUser = user.id.startsWith('user-new');

    useEffect(() => {
        if(isNewUser && !formData.code && !isGeneratingCode) {
            handleGenerateCode();
        }
    }, [isNewUser]);

    const handleGenerateCode = async () => {
        const newCode = await generateCode();
        setFormData(prev => ({ ...prev, code: newCode }));
    };

    const handlePermissionChange = (permission: Permission, isChecked: boolean) => {
        let newPermissions = new Set(formData.permissions);
        const children = PERMISSIONS_HIERARCHY[permission as keyof typeof PERMISSIONS_HIERARCHY] || [];

        if (isChecked) {
            newPermissions.add(permission);
            children.forEach(child => newPermissions.add(child));
        } else {
            newPermissions.delete(permission);
            children.forEach(child => newPermissions.delete(child));
        }

        setFormData(prev => ({ ...prev, permissions: Array.from(newPermissions) }));
    };

    const handleSelectAllPermissions = (isChecked: boolean) => {
        if (isChecked) {
            const allPerms = Object.keys(PERMISSIONS_HIERARCHY).flatMap(p => [p, ...(PERMISSIONS_HIERARCHY[p as Permission] || [])]);
            setFormData(prev => ({...prev, permissions: Array.from(new Set(allPerms)) as Permission[]}));
        } else {
            setFormData(prev => ({...prev, permissions: []}));
        }
    };
    
    const handleManagedTeacherChange = (teacherId: string, isChecked: boolean) => {
        const currentManaged = formData.managedTeacherIds || [];
        let newManaged: string[];
        if (isChecked) {
            newManaged = [...currentManaged, teacherId];
        } else {
            newManaged = currentManaged.filter(id => id !== teacherId);
        }
        setFormData(prev => ({...prev, managedTeacherIds: newManaged}));
    };
    
    const allPossiblePermissions = new Set(Object.keys(PERMISSIONS_HIERARCHY).flatMap(p => [p, ...(PERMISSIONS_HIERARCHY[p as Permission] || [])]));
    const allPermissionsChecked = formData.permissions.length >= allPossiblePermissions.size;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-4">
                <h3 className="text-2xl font-bold text-primary">{isNewUser ? t('addNewUser') : t('userDetails')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block font-semibold">{t('username')}</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                     <div>
                        <label className="block font-semibold">{t('userCode')}</label>
                        <div className="flex gap-2">
                             <input 
                                type="text" 
                                value={formData.code}
                                readOnly
                                className="w-full p-2 border rounded bg-gray-100"
                            />
                            <button onClick={handleGenerateCode} disabled={isGeneratingCode} className="px-3 py-1 bg-sky-500 text-white rounded hover:bg-sky-600 disabled:bg-gray-400">
                                {isGeneratingCode ? t('generatingCode') : t('generateCode')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xl font-semibold text-primary">{t('permissions')}</h4>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={allPermissionsChecked} onChange={e => handleSelectAllPermissions(e.target.checked)} />
                            {t('selectAll')}
                        </label>
                    </div>

                    <div className="space-y-3 p-2 border rounded-lg max-h-60 overflow-y-auto">
                        {Object.keys(PERMISSIONS_HIERARCHY).map(parentPerm => {
                            const children = PERMISSIONS_HIERARCHY[parentPerm as Permission] || [];
                            return (
                                <div key={parentPerm} className="p-2 bg-gray-50 rounded">
                                    <label className="font-semibold flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.permissions.includes(parentPerm as Permission)}
                                            onChange={e => handlePermissionChange(parentPerm as Permission, e.target.checked)}
                                        />
                                        {t(`permission_${parentPerm}` as any)}
                                    </label>
                                    {children.length > 0 && (
                                        <div className="ps-8 pt-2 space-y-1">
                                            {children.map(childPerm => (
                                                <label key={childPerm} className="block flex items-center gap-2 text-sm">
                                                     <input 
                                                        type="checkbox" 
                                                        checked={formData.permissions.includes(childPerm)}
                                                        onChange={e => {
                                                            const isChecked = e.target.checked;
                                                            const newPerms = new Set(formData.permissions);
                                                            const parent = Object.keys(PERMISSIONS_HIERARCHY).find(p => PERMISSIONS_HIERARCHY[p as Permission]?.includes(childPerm));

                                                            if (isChecked) {
                                                                newPerms.add(childPerm);
                                                                // When a child is checked, its parent must also be checked.
                                                                if (parent) {
                                                                    newPerms.add(parent as Permission);
                                                                }
                                                            } else {
                                                                newPerms.delete(childPerm);
                                                                // When a child is unchecked, check if any of its siblings are still checked.
                                                                // If not, then uncheck the parent.
                                                                if (parent) {
                                                                    const siblings = PERMISSIONS_HIERARCHY[parent as Permission] || [];
                                                                    const anySiblingChecked = siblings.some(sibling => newPerms.has(sibling));
                                                                    if (!anySiblingChecked) {
                                                                        newPerms.delete(parent as Permission);
                                                                    }
                                                                }
                                                            }
                                                            setFormData({ ...formData, permissions: Array.from(newPerms) });
                                                        }}
                                                    />
                                                     {t(`permission_${childPerm}` as any)}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
                
                {formData.permissions.includes('view_reports_for_specific_teachers') && (
                     <div className="border-t pt-4">
                        <h4 className="text-xl font-semibold text-primary mb-2">{t('managedTeachers')}</h4>
                        <div className="p-2 border rounded-lg max-h-60 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
                            {allTeachers.map(teacher => (
                                <label key={teacher.id} className="flex items-center gap-2 p-1 bg-gray-50 rounded">
                                    <input 
                                        type="checkbox"
                                        checked={formData.managedTeacherIds?.includes(teacher.id)}
                                        onChange={e => handleManagedTeacherChange(teacher.id, e.target.checked)}
                                    />
                                    {teacher.name}
                                </label>
                            ))}
                        </div>
                     </div>
                )}


                <div className="flex gap-4 pt-4 border-t">
                    <button onClick={() => onSave(formData)} className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">{t('save')}</button>
                    <button onClick={onCancel} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">{t('cancel')}</button>
                </div>
            </div>
        </div>
    );
};

export default UserDetailsModal;