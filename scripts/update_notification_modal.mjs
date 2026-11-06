import fs from 'fs';

let content = fs.readFileSync('src/components/NotificationCenterModal.tsx', 'utf8');

// 1. Interface
const oldInterface = `  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}`;
const newInterface = `  onShowToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  isPushEnabled?: boolean;
  onEnablePush?: () => void;
  isRegisteringPush?: boolean;
}`;
content = content.replace(oldInterface, newInterface);
content = content.replace(oldInterface.replace(/\n/g, '\r\n'), newInterface.replace(/\n/g, '\r\n'));

// 2. Component signature
const oldSig = `  onToggleAutomatico,
  onShowToast
}) => {`;
const newSig = `  onToggleAutomatico,
  onShowToast,
  isPushEnabled = false,
  onEnablePush,
  isRegisteringPush = false
}) => {`;
content = content.replace(oldSig, newSig);
content = content.replace(oldSig.replace(/\n/g, '\r\n'), newSig.replace(/\n/g, '\r\n'));

// 3. Banner inside contentClassName
const bannerAnchor = `      {/* Banner Informativo */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">`;

const pushBanner = `      {/* Banner Notificações Push Firebase */}
      <div className="bg-[#0B1B2B] text-white rounded-2xl p-4 space-y-2.5 shadow-sm border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Lembretes Diários (Push)
            </span>
          </div>
          <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${isPushEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}\`}>
            {isPushEnabled ? 'Ativado' : 'Não ativado'}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Receba lembretes automáticos às 20h para registrar o diário de campo e os comprovantes do dia antes de dormir.
        </p>
        <button
          type="button"
          disabled={isRegisteringPush || isPushEnabled}
          onClick={onEnablePush}
          className="w-full h-10 rounded-xl bg-white hover:bg-slate-100 text-[#0B1B2B] text-xs font-bold transition flex items-center justify-center space-x-1.5 active:scale-[0.98] disabled:opacity-75"
        >
          {isRegisteringPush ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
          ) : (
            <span>{isPushEnabled ? 'Lembretes Ativados neste Dispositivo ✓' : 'Ativar Lembretes no Celular / Navegador'}</span>
          )}
        </button>
      </div>

      {/* Banner Informativo */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">`;

content = content.replace(bannerAnchor, pushBanner);
content = content.replace(bannerAnchor.replace(/\n/g, '\r\n'), pushBanner.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/NotificationCenterModal.tsx', content, 'utf8');
console.log('✅ NotificationCenterModal.tsx atualizado com sucesso!');
