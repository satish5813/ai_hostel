import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { MastersService } from './masters.service.js';
import { CurrentUser, MANAGEMENT, OFFICE, Roles } from '../auth/decorators.js';
import { zod } from '../common/zod.pipe.js';
import type { AuthUser } from '../auth/auth.types.js';

const RoomProfileDto = z.object({ room_type_id: z.number().int(), reserved_for: z.enum(['None', 'Staff', 'Guest', 'Medical']), is_accessible: z.boolean(), approved_by: z.string().optional() });
const StaffAllocDto = z.object({ staff_id: z.string().min(1), subspace_id: z.string().min(1), key_no: z.string().min(1), approved_by: z.string().min(1), remarks: z.string().optional() });
const ContactDto = z.object({
  relation: z.enum(['Self', 'Father', 'Mother', 'Guardian', 'Spouse', 'Brother', 'Sister', 'Communication', 'Other']),
  contact_name: z.string().min(2).max(120),
  mobile_no: z.string().regex(/^[6-9][0-9]{9}$/, 'ten-digit Indian mobile number'),
  is_outpass_approver: z.boolean().optional(),
});

@ApiTags('masters')
@ApiBearerAuth()
@Controller()
export class MastersController {
  constructor(private svc: MastersService) {}

  @Get('me') me(@CurrentUser() user: AuthUser) { return user; }
  @Get('hostels') hostels(@CurrentUser() u: AuthUser) { return this.svc.hostels(u?.scope ?? null); }
  @Get('hostels/:id/room-types') hostelRoomTypes(@Param('id') id: string) { return this.svc.hostelRoomTypes(id); }
  @Get('academic-years') years() { return this.svc.academicYears(); }
  @Get('room-types') roomTypes() { return this.svc.roomTypes(); }
  @Get('vacancy') vacancy(@Query('facility_id') f?: string) { return this.svc.vacancy(f); }

  @Roles(...OFFICE, ...MANAGEMENT, 'Maintenance_Supervisor', 'Security_Officer', 'Accounts_Section')
  @Get('beds') beds(@Query('facility_id') facility_id?: string, @Query('zone_id') zone_id?: string, @Query('bed_status') bed_status?: string) {
    return this.svc.beds({ facility_id, zone_id, bed_status });
  }

  @Get('me/room') myRoom(@CurrentUser() user: AuthUser) { return this.svc.myRoom(user); }
  @Get('students/:id') student(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.svc.student(id, user); }
  @Roles('Student') @Put('me/photo') photo(@Body(zod(z.object({ photo: z.string().max(300_000).nullable() }))) b: { photo: string | null }, @CurrentUser() user: AuthUser) { return this.svc.setPhoto(user, b.photo); }
  @Post('students/:id/contacts') addContact(@Param('id') id: string, @Body(zod(ContactDto)) dto: z.infer<typeof ContactDto>, @CurrentUser() user: AuthUser) {
    return this.svc.addContact(user, id, dto);
  }
  @Post('contacts/:id/verify') verify(@Param('id', ParseIntPipe) id: number, @Body(zod(z.object({ otp: z.string().length(6) }))) b: { otp: string }, @CurrentUser() user: AuthUser) {
    return this.svc.verifyContact(user, id, b.otp);
  }
  @Post('contacts/:id/outpass-approver') approver(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.svc.setOutpassApprover(user, id);
  }

  @Roles(...OFFICE)
  @Get('rooms/:spaceId/assets') roomAssets(@Param('spaceId') spaceId: string) { return this.svc.roomAssets(spaceId); }

  /** REG-08: Office marks a bed blocked (Damaged) or released (Vacant), with a reason. Occupied and Held are set by the workflow. */
  @Roles('Office_Staff', 'Room_Allotment', 'Chief_Warden', 'Director_Hostels')
  @Post('beds/:id/status') bedStatus(@Param('id') id: string, @Body(zod(z.object({ status: z.enum(['Vacant', 'Damaged']), reason: z.string().min(3) }))) b: { status: 'Vacant' | 'Damaged'; reason: string }, @CurrentUser() user: AuthUser) {
    return this.svc.setBedStatus(user, id, b.status, b.reason);
  }
  /** REG-08: Maintenance marks a room Under maintenance or fit again. */
  @Roles('Maintenance_Supervisor', 'Office_Staff', 'Chief_Warden', 'Director_Hostels')
  @Post('rooms/:id/status') roomStatus(@Param('id') id: string, @Body(zod(z.object({ status: z.enum(['Available', 'Under_Maintenance']), reason: z.string().min(3) }))) b: { status: 'Available' | 'Under_Maintenance'; reason: string }, @CurrentUser() user: AuthUser) {
    return this.svc.setRoomStatus(user, id, b.status, b.reason);
  }
  /** MAP-01: room type, reservation and accessibility of a room (Office C E; approved by the Chief Warden). */
  @Roles('Office_Staff', 'Room_Allotment', 'Chief_Warden', 'Director_Hostels', 'admin')
  @Post('rooms/:id/profile') roomProfile(@Param('id') id: string, @Body(zod(RoomProfileDto)) b: z.infer<typeof RoomProfileDto>, @CurrentUser() user: AuthUser) {
    return this.svc.setRoomProfile(user, id, b);
  }
  /** MAP-05: rooms for resident faculty and staff. */
  @Roles('Office_Staff', 'Room_Allotment', 'Chief_Warden', 'Director_Hostels')
  @Get('staff-allocations') staffAllocations(@Query('facility_id') f: string | undefined, @CurrentUser() u: AuthUser) { return this.svc.staffAllocations(f, u); }
  @Roles('Office_Staff', 'Room_Allotment', 'Chief_Warden', 'Director_Hostels')
  @Post('staff-allocations') staffAllocate(@Body(zod(StaffAllocDto)) b: z.infer<typeof StaffAllocDto>, @CurrentUser() user: AuthUser) { return this.svc.staffAllocate(user, b); }
  @Roles('Office_Staff', 'Room_Allotment', 'Chief_Warden', 'Director_Hostels')
  @Post('staff-allocations/:id/vacate') staffVacate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) { return this.svc.staffVacate(user, id); }
  /** Staff directory look-up for mapping and allotment forms. */
  @Roles(...OFFICE, 'admin')
  @Get('staff') staff(@Query('q') q?: string) { return this.svc.staff(q); }
}
