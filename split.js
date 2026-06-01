import fs from 'fs';
const file = fs.readFileSync('./components/LandingPage.tsx', 'utf-8');

// The file has a structure: if (user) { return ( ... ) } return ( ... )

function writeDashboard() {
  const parts = file.split('if (user) {');
  let beforeUser = parts[0];
  const userPart = parts[1].split(/^\s*\/\/\s*LOGGED OUT LANDING VIEW/m)[0];

  const imports = beforeUser.match(/import.*?;/gm).join('\n');
  const dashContent = imports + `\n\ninterface DashboardProps {
  onTryDemo: () => void;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onBuyCredits?: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  user: any;
  onLogout?: () => void;
  history?: any[];
  onViewHistory?: (item: any) => void;
  onDeleteHistory?: (itemId: string) => void;
  onSettingsClick?: () => void;
  drafts?: any[];
  onResumeDraft?: (draft: any) => void;
  onDeleteDraft?: (draftId: string) => void;
}
export const Dashboard: React.FC<DashboardProps> = ({ 
  onTryDemo, 
  onLoginClick, 
  onSignupClick,
  onBuyCredits,
  darkMode, 
  toggleDarkMode, 
  user, 
  onLogout,
  history = [],
  onViewHistory,
  onDeleteHistory,
  onSettingsClick,
  drafts = [],
  onResumeDraft,
  onDeleteDraft
}) => {
${beforeUser.substring(beforeUser.indexOf('const [stats, setStats]'))}
  if (user) {${userPart}
};
export default Dashboard;
`;
  
  fs.writeFileSync('./components/Dashboard.tsx', dashContent.replace('export default LandingPage;', ''));
}
writeDashboard();
