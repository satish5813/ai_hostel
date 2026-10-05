import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { zod } from '../common/zod.pipe.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { SetupService } from './setup.service.js';

const YearDto = z.object({ academic_year: z.string().regex(/^\d{4}-\d{2}$/, 'like 2027-28'), start_date: z.string().date(), end_date: z.string().date() });
const HostelDto = z.object({ hostel_code: z.string().regex(/^[A-Za-z0-9]{2,8}$/, '2 to 8 letters or digits'), facility_name: z.string().min(3), hostel_gender: z.enum(['Boys', 'Girls', 'Staff']), floors: z.number().int().min(1).max(30), campus_id: z.string().optional(), gate_close_time: z.string().optional() });
const RoomsDto = z.object({ room_nos: z.array(z.string().regex(/^[A-Za-z0-9]{1,6}$/)).min(1).max(200), space_category: z.enum(['Hostel_Room', 'Toilet_Block', 'Common_Area', 'Store', 'Mess_Hall', 'Office']), room_type_id: z.number().int().optional(), reserved_for: z.enum(['None', 'Staff', 'Guest', 'Medical']).optional(), is_accessible: z.boolean().optional() });
const RoomTypeDto = z.object({ type_name: z.string().min(3), sharing_count: z.number().int().min(1).max(12), is_ac: z.boolean(), attached_bath: z.boolean().optional() });
const FeeDto = z.object({ room_type_id: z.number().int(), facility_id: z.string(), academic_year: z.string(), registration_fee: z.number().nonnegative(), hostel_fee: z.number().positive(), caution_deposit: z.number().nonnegative().default(10000), elec_caution_deposit: z.number().nonnegative().default(2000), meter_charge: z.number().nonnegative().default(500), instalment_1_pct: z.number().min(1).max(100), instalment_2_due_date: z.string().date() });
const MessDto = z.object({ mess_name: z.string().min(3), facility_id: z.string(), incharge_id: z.string().optional(), capacity: z.number().int().positive(), annual_fee: z.number().nonnegative(), make_default: z.boolean().optional() });
const StaffDto = z.object({ staff_id: z.string().min(2).max(20), salutation: z.string().optional(), first_name: z.string().min(1), last_name: z.string().optional(), gender: z.enum(['Male', 'Female', 'Other']), dept_code: z.string(), designation: z.string().min(2),
  staff_type: z.enum(['Faculty', 'Warden', 'Lab_Assistant', 'Maintenance', 'Sports_Coach', 'Admin', 'Security', 'Housekeeping', 'Mess', 'Medical', 'Counsellor', 'Other']), mobile_no: z.string().regex(/^[6-9][0-9]{9}$/, 'ten-digit mobile number'), official_email: z.string().email().optional().or(z.literal('')) });
const StudentDto = z.object({ student_id: z.string().min(5).max(20), full_name: z.string().min(3), gender: z.enum(['Male', 'Female', 'Other']), student_type: z.enum(['UG', 'PG', 'PhD']), programme: z.string().min(2), date_of_birth: z.string().date(), personal_email: z.string().email(), dept_code: z.string().optional(), father_name: z.string().optional(), parent_mobile: z.string().regex(/^[6-9][0-9]{9}$/).optional().or(z.literal('')) });

const BUILDERS = ['admin', 'Office_Staff', 'Room_Allotment'] as const;                       // MAP-01: ADM X, OFF C E
const VIEWERS = [...BUILDERS, 'Chief_Warden', 'Director_Hostels', 'Warden', 'Floor_Warden', 'Accounts_Section'] as const;

/** Masters set up by the Data Administrator (and, for rooms and beds, the Hostel Office). */
@ApiTags('ADM · masters and set-up')
@ApiBearerAuth()
@Controller()
export class SetupController {
  constructor(private svc: SetupService) {}

  @Roles('admin') @Get('admin/overview') overview() { return this.svc.overview(); }

  @Roles('admin') @Get('admin/academic-years') years() { return this.svc.years(); }
  @Roles('admin') @Post('admin/academic-years') addYear(@Body(zod(YearDto)) b: z.infer<typeof YearDto>, @CurrentUser() u: AuthUser) { return this.svc.addYear(u, b); }
  @Roles('admin') @Post('admin/academic-years/:year/current') current(@Param('year') year: string, @CurrentUser() u: AuthUser) { return this.svc.setCurrentYear(u, year); }

  @Roles(...VIEWERS) @Get('structure') structure() { return this.svc.structure(); }
  @Roles('admin') @Post('admin/hostels') addHostel(@Body(zod(HostelDto)) b: z.infer<typeof HostelDto>, @CurrentUser() u: AuthUser) { return this.svc.addHostel(u, b); }
  @Roles(...BUILDERS) @Post('hostels/:id/floors') addFloor(@Param('id') id: string, @Body(zod(z.object({ zone_name: z.string().optional() }))) b: { zone_name?: string }, @CurrentUser() u: AuthUser) { return this.svc.addFloor(u, id, b.zone_name); }
  @Roles(...BUILDERS) @Post('floors/:zoneId/rooms') addRooms(@Param('zoneId') zoneId: string, @Body(zod(RoomsDto)) b: z.infer<typeof RoomsDto>, @CurrentUser() u: AuthUser) { return this.svc.addRooms(u, zoneId, b); }

  @Roles('admin') @Post('admin/room-types') addRoomType(@Body(zod(RoomTypeDto)) b: z.infer<typeof RoomTypeDto>, @CurrentUser() u: AuthUser) { return this.svc.addRoomType(u, b); }
  @Roles('admin', 'Accounts_Section') @Get('admin/room-type-fees') fees(@Query('academic_year') y?: string) { return this.svc.fees(y); }
  @Roles('admin', 'Accounts_Section') @Post('admin/room-type-fees') setFee(@Body(zod(FeeDto)) b: z.infer<typeof FeeDto>, @CurrentUser() u: AuthUser) { return this.svc.setFee(u, b); }

  @Roles('admin') @Get('admin/messes') messes() { return this.svc.messes(); }
  @Roles('admin') @Post('admin/messes') addMess(@Body(zod(MessDto)) b: z.infer<typeof MessDto>, @CurrentUser() u: AuthUser) { return this.svc.addMess(u, b); }

  @Roles('admin') @Get('admin/departments') departments() { return this.svc.departments(); }
  @Roles('admin') @Get('admin/staff') staff(@Query('q') q?: string) { return this.svc.staffList(q); }
  @Roles('admin') @Post('admin/staff') addStaff(@Body(zod(StaffDto)) b: z.infer<typeof StaffDto>, @CurrentUser() u: AuthUser) { return this.svc.addStaff(u, b); }
  @Roles('admin') @Get('admin/students') students(@Query('q') q?: string) { return this.svc.studentList(q); }
  @Roles('admin') @Post('admin/students') addStudent(@Body(zod(StudentDto)) b: z.infer<typeof StudentDto>, @CurrentUser() u: AuthUser) { return this.svc.addStudent(u, b); }
}
