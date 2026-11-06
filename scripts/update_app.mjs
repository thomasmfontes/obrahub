import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Import requestPushPermission
if (!content.includes("from './services/fcm'")) {
  content = content.replace(
    "import { uploadMissionPhoto } from './services/firebase';",
    "import { uploadMissionPhoto } from './services/firebase';\nimport { requestPushPermission } from './services/fcm';"
  );
  content = content.replace(
    "import { uploadMissionPhoto } from './services/firebase';\r\n",
    "import { uploadMissionPhoto } from './services/firebase';\r\nimport { requestPushPermission } from './services/fcm';\r\n"
  );
}

// 2. State variables
const stateAnchor = "  const [expCategory, setExpCategory] = useState<'fuel' | 'utensils' | 'bed' | 'church'>('fuel');";
const stateNew = `  const [expCategory, setExpCategory] = useState<'fuel' | 'utensils' | 'bed' | 'church'>('fuel');
  const [expDate, setExpDate] = useState<string>('');
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch {
      return false;
    }
  });
  const [isRegisteringPush, setIsRegisteringPush] = useState<boolean>(false);`;
content = content.replace(stateAnchor, stateNew);
content = content.replace(stateAnchor.replace(/\n/g, '\r\n'), stateNew.replace(/\n/g, '\r\n'));

// 3. handleEnablePush handler
const handlePushAnchor = "  // Abre Bottom Sheet para adicionar despesa";
const handlePushCode = `  const handleEnablePush = async () => {
    setIsRegisteringPush(true);
    try {
      const res = await requestPushPermission(idMissionario || undefined);
      if (res.success) {
        setIsPushEnabled(true);
        showNotification("Lembretes noturnos às 20h ativados com sucesso!", "success");
      } else {
        showNotification(res.error || "Permissão de notificação não concedida.", "warning");
      }
    } catch {
      showNotification("Não foi possível registrar o dispositivo para push.", "error");
    } finally {
      setIsRegisteringPush(false);
    }
  };

  // Abre Bottom Sheet para adicionar despesa`;
content = content.replace(handlePushAnchor, handlePushCode);
content = content.replace(handlePushAnchor.replace(/\n/g, '\r\n'), handlePushCode.replace(/\n/g, '\r\n'));

// 4. handleOpenExpenseSheet with defaultDate parameter
const oldOpenSheet = `  const handleOpenExpenseSheet = () => {
    setEditingExpenseId(null);
    setExpExistingUrls([]);
    setExpenseError('');
    uploadedReceiptRef.current = null;
    receiptScanVersion.current++;
    triggerHaptic('light');
    setExpTitle('');
    setExpMaskedValue('R$ 0,00');
    setExpRawValue(0);
    setExpCategory('fuel');
    setExpReceiptFile(null);
    setExpReceiptPreview(null);
    setDetectedReceiptInfo(null);
    setIsScanningReceipt(false);
    setIsExpenseSheetOpen(true);
  };`;

const newOpenSheet = `  const handleOpenExpenseSheet = (defaultDate?: string) => {
    setEditingExpenseId(null);
    setExpExistingUrls([]);
    setExpenseError('');
    uploadedReceiptRef.current = null;
    receiptScanVersion.current++;
    triggerHaptic('light');
    setExpTitle('');
    setExpMaskedValue('R$ 0,00');
    setExpRawValue(0);
    setExpCategory('fuel');
    setExpDate(defaultDate || selectedDay || new Date().toISOString().slice(0, 10));
    setExpReceiptFile(null);
    setExpReceiptPreview(null);
    setDetectedReceiptInfo(null);
    setIsScanningReceipt(false);
    setIsExpenseSheetOpen(true);
  };`;
content = content.replace(oldOpenSheet, newOpenSheet);
content = content.replace(oldOpenSheet.replace(/\n/g, '\r\n'), newOpenSheet.replace(/\n/g, '\r\n'));

// 5. handleEditExpense setExpDate
const oldEditSheet = `    setExpCategory(expense.t_icone_identificador as typeof expCategory);
    setExpExistingUrls(expense.t_comprovante_storage_urls || []);
    setExpReceiptPreview(expense.t_comprovante_storage_urls?.[0] || null);
  };`;

const newEditSheet = `    setExpCategory(expense.t_icone_identificador as typeof expCategory);
    setExpDate(expense.t_data_despesa || selectedDay || '');
    setExpExistingUrls(expense.t_comprovante_storage_urls || []);
    setExpReceiptPreview(expense.t_comprovante_storage_urls?.[0] || null);
  };`;
content = content.replace(oldEditSheet, newEditSheet);
content = content.replace(oldEditSheet.replace(/\n/g, '\r\n'), newEditSheet.replace(/\n/g, '\r\n'));

// 6. saveDespesaRubrica call: add t_data_despesa
const oldSaveCall = `      const saved = await saveDespesaRubrica({
        id_despesa: editingExpenseId || undefined,
        id_relatorio: relId,
        nm_rubrica: expTitle.trim().slice(0, 80),
        dc_valor_despesa: expRawValue,
        t_icone_identificador: expCategory,
        nr_comprovantes_anexados: receiptUrls.length,
        t_comprovante_storage_urls: receiptUrls
      });`;

const newSaveCall = `      const saved = await saveDespesaRubrica({
        id_despesa: editingExpenseId || undefined,
        id_relatorio: relId,
        nm_rubrica: expTitle.trim().slice(0, 80),
        dc_valor_despesa: expRawValue,
        t_icone_identificador: expCategory,
        nr_comprovantes_anexados: receiptUrls.length,
        t_comprovante_storage_urls: receiptUrls,
        t_data_despesa: expDate || undefined
      });`;
content = content.replace(oldSaveCall, newSaveCall);
content = content.replace(oldSaveCall.replace(/\n/g, '\r\n'), newSaveCall.replace(/\n/g, '\r\n'));

// 7. WizardStep2 props in JSX
const oldW2Props = `              onBack={handleBackToStep1}
              onNext={handleNextFromStep2}
              isSaving={isSaving}
            />`;

const newW2Props = `              onBack={handleBackToStep1}
              onNext={handleNextFromStep2}
              isSaving={isSaving}
              despesas={despesas}
              onOpenExpenseSheetForDay={(day) => handleOpenExpenseSheet(day)}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
            />`;
content = content.replace(oldW2Props, newW2Props);
content = content.replace(oldW2Props.replace(/\n/g, '\r\n'), newW2Props.replace(/\n/g, '\r\n'));

// 8. Add Date input in BottomSheet for Expense
const oldDescField = `            {/* Descrição da Rubrica */}
            <div>
              <label htmlFor="expense-description" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Descrição da Despesa
              </label>`;

const newDescField = `            {/* Data da Despesa / Comprovante */}
            <div>
              <label htmlFor="expense-date" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Data da Despesa / Comprovante
              </label>
              <input 
                type="date"
                id="expense-date"
                aria-label="Data da despesa"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 shadow-2xs transition"
              />
            </div>

            {/* Descrição da Rubrica */}
            <div>
              <label htmlFor="expense-description" className="text-xs font-semibold text-slate-700 block mb-1.5">
                Descrição da Despesa
              </label>`;
content = content.replace(oldDescField, newDescField);
content = content.replace(oldDescField.replace(/\n/g, '\r\n'), newDescField.replace(/\n/g, '\r\n'));

// 9. NotificationCenterModal props in JSX
const oldModalProps = `        <NotificationCenterModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          destinatarios={destinatarios}
          onSaveDestinatario={handleSaveDestinatario}
          onDeleteDestinatario={handleDeleteDestinatario}
          onToggleAutomatico={handleToggleAutomatico}
          onShowToast={showNotification}
        />`;

const newModalProps = `        <NotificationCenterModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          destinatarios={destinatarios}
          onSaveDestinatario={handleSaveDestinatario}
          onDeleteDestinatario={handleDeleteDestinatario}
          onToggleAutomatico={handleToggleAutomatico}
          onShowToast={showNotification}
          isPushEnabled={isPushEnabled}
          onEnablePush={handleEnablePush}
          isRegisteringPush={isRegisteringPush}
        />`;
content = content.replace(oldModalProps, newModalProps);
content = content.replace(oldModalProps.replace(/\n/g, '\r\n'), newModalProps.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('✅ App.tsx atualizado com sucesso!');
