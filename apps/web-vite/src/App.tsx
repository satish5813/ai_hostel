import { Navigate, Route, Routes } from 'react-router';
import { Shell } from './app/shell';
import SignIn from './pages/SignIn';
import Home from './pages/Home';
import Profile from './pages/general/Profile';
import Notifications from './pages/general/Notifications';
import Approvals from './pages/general/Approvals';
import ScreenMap from './pages/general/Screens';
import Registration from './pages/student/Registration';
import Fees from './pages/student/Fees';
import Electricity from './pages/student/Electricity';
import Outings from './pages/student/Outings';
import SickLeave from './pages/student/SickLeave';
import ParentRecommendation from './pages/parent/Recommendation';
import Allotment from './pages/office/Allotment';
import FeeChecks from './pages/warden/FeeChecks';
import RollCall from './pages/warden/RollCall';
import RoomBlocking from './pages/office/RoomBlocking';
import AllotmentApprovals from './pages/office/AllotmentApprovals';
import RoomMapping from './pages/office/RoomMapping';
import FloorHome from './pages/warden/FloorHome';
import AdminDashboard from './pages/admin/Dashboard';
import Maintenance from './pages/warden/Maintenance';
import Academics from './pages/general/Academics';
import Student360 from './pages/general/Student360';
import AccessControl from './pages/tracking/AccessControl';
import DutyRoster from './pages/office/DutyRoster';
import MappingCentre from './pages/office/MappingCentre';
import CheckIn from './pages/office/CheckIn';
import Occupancy from './pages/office/Occupancy';
import Rooms from './pages/office/Rooms';
import StaffMapping from './pages/office/StaffMapping';
import QrLabels from './pages/office/QrLabels';
import StaffRooms from './pages/office/StaffRooms';
import Dues from './pages/accounts/Dues';
import Tariff from './pages/accounts/Tariff';
import Meters from './pages/maintenance/Meters';
import StatusBoard from './pages/tracking/StatusBoard';
import LookUp from './pages/tracking/LookUp';
import Alerts from './pages/tracking/Alerts';
import Gate from './pages/tracking/Gate';
import CapturePoints from './pages/tracking/CapturePoints';
import LookUpLog from './pages/tracking/LookUpLog';
import OutingApprovals from './pages/warden/OutingApprovals';
import SickLeaveApprovals from './pages/warden/SickLeaveApprovals';
import MessSickList from './pages/mess/SickList';
import OccupancyFeesDues from './pages/reports/OccupancyFeesDues';
import Users from './pages/admin/Users';
import Settings from './pages/admin/Settings';
import AuditLog from './pages/admin/AuditLog';
import Masters from './pages/admin/Masters';
import Attendance from './pages/tracking/Attendance';
import ApprovalLink from './pages/ApprovalLink';
import QrPage from './pages/Qr';
import DataPage from './admin/DataPage';
import DatabasePage from './admin/DatabasePage';
import RoomBuilder from './pages/admin/RoomBuilder';
import AllotmentView from './pages/office/AllotmentView';
import Renewals from './pages/office/Renewals';
import MessMenu from './pages/mess/MessMenu';
import WeeklyMenu from './pages/mess/WeeklyMenu';
import MealChoice from './pages/student/MealChoice';
import MealChoices from './pages/reports/MealChoices';
import MessSentiment from './pages/reports/MessSentiment';
import EnterChoices from './pages/mess/EnterChoices';
import RateMeals from './pages/student/RateMeals';
import ExecDashboard from './pages/exec/ExecDashboard';
import CareerTracker from './pages/career/CareerTracker';
import HealthDesk from './pages/health/HealthDesk';
import HealthReportPage from './pages/health/HealthReport';
import MyHealth from './pages/health/MyHealth';
import ChangeRoom from './pages/rooms/ChangeRoom';
import RoomChanges from './pages/rooms/RoomChanges';
import CautionDeposits from './pages/deposit/CautionDeposits';
import MyDeposit from './pages/deposit/MyDeposit';
import MyTickets from './pages/student/MyTickets';
import RepairDesk from './pages/maintenance/RepairDesk';
import ElectricityBills from './pages/maintenance/ElectricityBills';
import DeanHome from './pages/dean/DeanHome';
import AbsenceReport from './pages/dean/AbsenceReport';
import Discipline from './pages/dean/Discipline';
import WeeklyReports from './pages/dean/WeeklyReports';
import Careers from './pages/dean/Careers';
import Overview from './pages/warden/Overview';
import Exceptions from './pages/warden/Exceptions';
import Logins from './pages/admin/Logins';

/** Routes carry the screen codes of the Roles document (see src/app/screens.ts). */
export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />                      {/* GEN-01 */}
        <Route path="/notifications" element={<Notifications />} />          {/* GEN-02 */}
        <Route path="/approvals" element={<Approvals />} />                  {/* GEN-03 */}
        <Route path="/screens" element={<ScreenMap />} />
        <Route path="/registration" element={<Registration />} />            {/* REG-01 03 04 */}
        <Route path="/fees" element={<Fees />} />                            {/* REG-02 */}
        <Route path="/allotment" element={<Allotment />} />                  {/* REG-05 */}
        <Route path="/fee-checks" element={<FeeChecks />} />                 {/* REG-09 (addition) */}
        <Route path="/check-in" element={<CheckIn />} />                     {/* REG-06 */}
        <Route path="/dues" element={<Dues />} />                            {/* REG-07 */}
        <Route path="/occupancy" element={<Occupancy />} />                  {/* REG-08 */}
        <Route path="/rooms" element={<Rooms />} />                          {/* MAP-01 */}
        <Route path="/staff-mapping" element={<StaffMapping />} />           {/* MAP-02 */}
        <Route path="/qr-labels" element={<QrLabels />} />                   {/* MAP-03 */}
        <Route path="/a/:token" element={<ApprovalLink />} />                {/* one-time link: parent, Dean (D2, D3) */}
        <Route path="/qr/:token" element={<QrPage />} />                     {/* MAP-04 */}
        <Route path="/staff-rooms" element={<StaffRooms />} />
        <Route path="/duty-roster" element={<DutyRoster />} />               {/* MAP-06 (addition) */}
        <Route path="/mapping" element={<MappingCentre />} />                {/* MAP-07 (addition) */}
        <Route path="/mapping/data/:kind" element={<DataPage />} />               {/* MAP-05 */}
        <Route path="/electricity" element={<Electricity />} />              {/* ELE-01 */}
        <Route path="/meters" element={<Meters />} />                        {/* ELE-02 */}
        <Route path="/tariff" element={<Tariff />} />                        {/* ELE-03 */}
        <Route path="/status-board" element={<StatusBoard />} />             {/* TRK-01 */}
        <Route path="/look-up" element={<LookUp />} />                       {/* TRK-02 */}
        <Route path="/alerts" element={<Alerts />} />                        {/* TRK-03 */}
        <Route path="/gate" element={<Gate />} />                            {/* TRK-04 */}
        <Route path="/capture-points" element={<CapturePoints />} />         {/* TRK-05 */}
        <Route path="/look-up-log" element={<LookUpLog />} />                {/* TRK-06 */}
        <Route path="/outings" element={<Outings />} />                      {/* OUT-01 */}
        <Route path="/parent-recommendation" element={<ParentRecommendation />} /> {/* OUT-02 */}
        <Route path="/outing-approvals" element={<OutingApprovals />} />     {/* OUT-03 */}
        <Route path="/sick-leave" element={<SickLeave />} />                 {/* SCK-01 */}
        <Route path="/sick-leave-approvals" element={<SickLeaveApprovals />} /> {/* SCK-02 */}
        <Route path="/mess-sick-list" element={<MessSickList />} />          {/* SCK-03 */}
        <Route path="/reports/occupancy-fees-dues" element={<OccupancyFeesDues />} /> {/* RPT-07 */}
        <Route path="/admin/room-builder" element={<RoomBuilder />} />      {/* Administrator: build a hostel */}
        <Route path="/admin/logins" element={<Logins />} />                 {/* Administrator: logins and hostels (D7) */}
        <Route path="/admin/db" element={<DatabasePage />} />                {/* Data Administrator: every table */}
        <Route path="/admin/data/:kind" element={<DataPage />} />           {/* ADM-04 data workspace */}
        <Route path="/admin/masters" element={<Masters />} />                {/* ADM-04 (addition) */}
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/roll-call" element={<RollCall />} />
        <Route path="/room-blocking" element={<RoomBlocking />} />           {/* REG-10 (design) */}
        <Route path="/allotment-approvals" element={<AllotmentApprovals />} /> {/* REG-11 (design) */}
        <Route path="/overview" element={<Overview />} />                   {/* CWP-01 Chief Warden overview */}
        <Route path="/exceptions" element={<Exceptions />} />               {/* REG-13 exceptions */}
        <Route path="/dean" element={<DeanHome />} />                 {/* DSA-01 Dean, Students Affairs */}
        <Route path="/absence-report" element={<AbsenceReport />} />  {/* RPT-09 */}
        <Route path="/discipline" element={<Discipline />} />         {/* DIS-07 */}
        <Route path="/weekly-reports" element={<WeeklyReports />} />  {/* RPT-10 */}
        <Route path="/career-guidance" element={<Careers />} />      {/* ACA-03 */}
        <Route path="/mess-menu" element={<MessMenu />} />            {/* MES-01 routine menu */}
        <Route path="/weekly-menu" element={<WeeklyMenu />} />        {/* MES-08 weekly menu: mess in-charge and chef */}
        <Route path="/my-meals" element={<MealChoice />} />           {/* MES-09 student chooses next week's dishes */}
        <Route path="/reports/meal-choices" element={<MealChoices />} /> {/* RPT-11 weekly meal choices */}
        <Route path="/reports/mess-sentiment" element={<MessSentiment />} /> {/* RPT-12 mess sentiment dashboard */}
        <Route path="/meal-entry" element={<EnterChoices />} />         {/* MES-10 Chief Chef enters students' choices */}
        <Route path="/rate-meals" element={<RateMeals />} />
        <Route path="/my-tickets" element={<MyTickets />} />            {/* TKT-01 student raises and confirms repairs */}
        <Route path="/repair-desk" element={<RepairDesk />} />          {/* TKT-03 check, repair, closure report */}
        <Route path="/electricity-bills" element={<ElectricityBills />} /> {/* ELE-04 room bills shared by roommates */}
        <Route path="/health" element={<HealthDesk />} />                 {/* HLT-01 health records: capture, students */}
        <Route path="/health/report/:id" element={<HealthReportPage />} /> {/* HLT-02 one health report */}
        <Route path="/my-health" element={<MyHealth />} />
        <Route path="/room-changes" element={<RoomChanges />} />          {/* RCH-01 room change requests: approve, move, settle */}
        <Route path="/change-room" element={<ChangeRoom />} />
        <Route path="/caution-deposits" element={<CautionDeposits />} />  {/* CDP-01 caution deposits: deductions, dues, refunds */}
        <Route path="/my-deposit" element={<MyDeposit />} />              {/* CDP-02 student's own caution deposit */}            {/* RCH-02 student asks for another room */}               {/* HLT-03 student's own health */}
        <Route path="/career-tracker" element={<CareerTracker />} />      {/* CAR-01 second-year progress, final-year outcomes */}
        <Route path="/exec" element={<ExecDashboard />} />                {/* EXE-01 executive dashboard (no menu) */}
        <Route path="/exec/:facilityId" element={<ExecDashboard />} />    {/* EXE-01 one building */}            {/* MES-02 student rates the dishes eaten */}
        <Route path="/renewals" element={<Renewals />} />             {/* REG-14 yearly renewals: continue the stay into the new year */}
        <Route path="/allotment-view" element={<AllotmentView />} />        {/* REG-12 whole hostel: floors, rooms, beds, staff */}
        <Route path="/room-mapping" element={<RoomMapping />} />             {/* MAP-08 (design) */}
        <Route path="/floor" element={<FloorHome />} />                       {/* Floor Warden: my floor today */}
        <Route path="/admin/board" element={<AdminDashboard />} />           {/* Data Administrator: set-up board */}
        <Route path="/maintenance" element={<Maintenance />} />              {/* TKT-01 02 04 */}
        <Route path="/academics" element={<Academics />} />                  {/* ACA-01 */}
        <Route path="/academics/:id" element={<Student360 />} />
        <Route path="/access" element={<AccessControl />} />                 {/* TRK-09 (addition) */}                   {/* TRK-08 (addition) */}                 {/* TRK-07 (addition) */}
        <Route path="/admin/users" element={<Users />} />                    {/* ADM-01 */}
        <Route path="/admin/settings" element={<Settings />} />              {/* ADM-02 */}
        <Route path="/admin/audit-log" element={<AuditLog />} />             {/* ADM-03 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
