import { relations } from "drizzle-orm/relations";
import { staff_masterInRef, departmentInRef, courseInRef, sectionInRef, batchInRef, subjectInRef, staff_qualificationInRef, campusInInfra, import_batchInShared, staff_contactInRef, staff_dependentInRef, staff_employment_historyInRef, staff_membershipInRef, spaceInInfra, sportInRef, staff_responsibilityInRef, student_masterInRef, facilityInInfra, zoneInInfra, subspaceInInfra, asset_masterInInfra, materialInPortal, vendorInPortal, class_allocationInInfra, timetable_slotInInfra, lab_allocationInInfra, lab_workstation_mapInInfra, activity_bookingInInfra, sports_membershipInInfra, space_availability_logInInfra, maintenance_teamInInfra, maintenance_categoryInInfra, technicianInInfra, maintenance_ticketInInfra, inspection_logInInfra, pm_scheduleInInfra, work_orderInInfra, work_order_partInInfra, amc_contractInInfra, utility_consumptionInInfra, app_userInPortal, categoryInPortal, gl_accountInPortal, sub_categoryInPortal, stock_groupInPortal, unit_of_measureInPortal, ledgerInPortal, hsn_sacInPortal, batchInPortal, locationInPortal, binInPortal, grnInPortal, serialised_stockInPortal, vendor_itemInPortal, transporterInPortal, tax_masterInPortal, budget_headInPortal, reorder_ruleInPortal, roleInPortal, approval_authority_matrixInPortal, stock_adjustmentInPortal, stock_movementInPortal, physical_countInPortal, deploymentInPortal, stock_entryInPortal, material_issueInPortal, receiptInPortal, stock_returnInPortal, return_to_vendorInPortal, scrap_returnInPortal, stock_transferInPortal, indentInPortal, indent_stepInPortal, stock_checkInPortal, hostel_allocationInHostel, dept_consumptionInPortal, purchase_orderInPortal, stock_transfer_lineInPortal, physical_count_lineInPortal, new_requestInPortal, po_lineInPortal, pr_lineInPortal, indent_lineInPortal, purchase_requisitionInPortal, rfqInPortal, vendor_evaluation_criteriaInPortal, vendor_evaluationInPortal, rfq_bidInPortal, vendor_rankingInPortal, po_counterInPortal, po_termsInPortal, po_amendmentInPortal, po_conditionInPortal, po_alertInPortal, approval_logInPortal, shipmentInPortal, shipment_trackingInPortal, gate_entryInPortal, documentInShared, quality_inspectionInPortal, quality_inspection_lineInPortal, debit_noteInPortal, commissioning_handoverInPortal, assetInPortal, asset_capitalisationInPortal, asset_transferInPortal, amc_renewalInPortal, service_ticketInPortal, budget_txnInPortal, vendor_invoiceInPortal, vendor_invoice_lineInPortal, po_paymentInPortal, advance_paymentInPortal, payment_allocationInPortal, journal_entryInPortal, journal_lineInPortal, vendor_performanceInPortal, approval_stepInShared, approval_ruleInShared, student_contactInHostel, policy_settingInShared, notificationInShared, mess_masterInHostel, hostel_profileInHostel, academic_yearInHostel, room_type_feeInHostel, room_typeInHostel, capture_pointInHostel, room_profileInHostel, fee_demandInHostel, mess_subscriptionInHostel, discipline_caseInHostel, discipline_punishmentInHostel, vacate_requestInHostel, no_dues_clearanceInHostel, hostel_registrationInHostel, room_offerInHostel, room_handoverInHostel, fee_planInHostel, staff_space_assignmentInHostel, space_qrInHostel, room_meterInHostel, electricity_tariffInHostel, meter_student_mapInHostel, fee_receiptInHostel, meter_readingInHostel, meter_rechargeInHostel, tracking_consentInHostel, student_current_statusInHostel, hostel_alertInHostel, location_access_logInHostel, sick_leaveInHostel, outpassInHostel, vendor_categoryInPortal, vendor_tagInPortal, material_aliasInPortal, bom_componentInPortal, stock_entry_findingInPortal, room_standard_inventoryInHostel, material_standard_rateInPortal, opening_stockInPortal, stock_reservationInPortal, rfq_vendorInPortal, equipment_coverInPortal, report_visibilityInShared, deployment_eventInPortal, stock_check_lineInPortal, amc_renewal_decisionInPortal, room_handover_lineInHostel, user_roleInPortal, indent_eventInPortal, new_request_eventInPortal, po_eventInPortal, material_issue_lineInPortal, meter_monthly_usageInHostel, movement_event_defaultInHostel, staff_addressInRef, sick_meal_deliveryInHostel, student_addressInRef, stock_sheetInPortal, stock_sheet_lineInPortal, stockInPortal } from "./schema.js";

export const departmentInRefRelations = relations(departmentInRef, ({one, many}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [departmentInRef.hod_staff_id],
		references: [staff_masterInRef.staff_id],
		relationName: "departmentInRef_hod_staff_id_staff_masterInRef_staff_id"
	}),
	courseInRefs: many(courseInRef),
	staff_masterInRefs: many(staff_masterInRef, {
		relationName: "staff_masterInRef_dept_code_departmentInRef_dept_code"
	}),
	student_masterInRefs: many(student_masterInRef),
	app_userInPortals: many(app_userInPortal),
	materialInPortals: many(materialInPortal),
	locationInPortals: many(locationInPortal),
	budget_headInPortals: many(budget_headInPortal),
	indentInPortals: many(indentInPortal),
	material_issueInPortals: many(material_issueInPortal),
	dept_consumptionInPortals: many(dept_consumptionInPortal),
	stock_returnInPortals: many(stock_returnInPortal),
	new_requestInPortals: many(new_requestInPortal),
	purchase_requisitionInPortals: many(purchase_requisitionInPortal),
	deploymentInPortals: many(deploymentInPortal),
	assetInPortals: many(assetInPortal),
	asset_transferInPortals_from_dept: many(asset_transferInPortal, {
		relationName: "asset_transferInPortal_from_dept_departmentInRef_dept_code"
	}),
	asset_transferInPortals_to_dept: many(asset_transferInPortal, {
		relationName: "asset_transferInPortal_to_dept_departmentInRef_dept_code"
	}),
	journal_lineInPortals: many(journal_lineInPortal),
	hostel_profileInHostels: many(hostel_profileInHostel),
	user_roleInPortals: many(user_roleInPortal),
}));

export const staff_masterInRefRelations = relations(staff_masterInRef, ({one, many}) => ({
	departmentInRefs: many(departmentInRef, {
		relationName: "departmentInRef_hod_staff_id_staff_masterInRef_staff_id"
	}),
	sectionInRefs: many(sectionInRef),
	staff_qualificationInRefs: many(staff_qualificationInRef),
	campusInInfra: one(campusInInfra, {
		fields: [staff_masterInRef.campus_code],
		references: [campusInInfra.campus_id]
	}),
	import_batchInShared: one(import_batchInShared, {
		fields: [staff_masterInRef.import_batch_id],
		references: [import_batchInShared.batch_id],
		relationName: "staff_masterInRef_import_batch_id_import_batchInShared_batch_id"
	}),
	departmentInRef: one(departmentInRef, {
		fields: [staff_masterInRef.dept_code],
		references: [departmentInRef.dept_code],
		relationName: "staff_masterInRef_dept_code_departmentInRef_dept_code"
	}),
	staff_contactInRefs: many(staff_contactInRef),
	staff_dependentInRefs: many(staff_dependentInRef),
	staff_employment_historyInRefs: many(staff_employment_historyInRef),
	staff_membershipInRefs: many(staff_membershipInRef),
	staff_responsibilityInRefs: many(staff_responsibilityInRef),
	student_masterInRefs: many(student_masterInRef),
	facilityInInfras: many(facilityInInfra),
	class_allocationInInfras: many(class_allocationInInfra),
	lab_allocationInInfras_faculty_id: many(lab_allocationInInfra, {
		relationName: "lab_allocationInInfra_faculty_id_staff_masterInRef_staff_id"
	}),
	lab_allocationInInfras_lab_assistant_id: many(lab_allocationInInfra, {
		relationName: "lab_allocationInInfra_lab_assistant_id_staff_masterInRef_staff_id"
	}),
	activity_bookingInInfras: many(activity_bookingInInfra),
	sports_membershipInInfras: many(sports_membershipInInfra),
	maintenance_teamInInfras: many(maintenance_teamInInfra),
	technicianInInfras: many(technicianInInfra),
	maintenance_ticketInInfras: many(maintenance_ticketInInfra),
	app_userInPortals: many(app_userInPortal),
	locationInPortals: many(locationInPortal),
	indentInPortals: many(indentInPortal),
	stock_transferInPortals_approved_by: many(stock_transferInPortal, {
		relationName: "stock_transferInPortal_approved_by_staff_masterInRef_staff_id"
	}),
	stock_transferInPortals_requested_by: many(stock_transferInPortal, {
		relationName: "stock_transferInPortal_requested_by_staff_masterInRef_staff_id"
	}),
	material_issueInPortals: many(material_issueInPortal),
	dept_consumptionInPortals: many(dept_consumptionInPortal),
	stock_returnInPortals_received_by: many(stock_returnInPortal, {
		relationName: "stock_returnInPortal_received_by_staff_masterInRef_staff_id"
	}),
	stock_returnInPortals_returned_by: many(stock_returnInPortal, {
		relationName: "stock_returnInPortal_returned_by_staff_masterInRef_staff_id"
	}),
	stock_adjustmentInPortals_approved_by: many(stock_adjustmentInPortal, {
		relationName: "stock_adjustmentInPortal_approved_by_staff_masterInRef_staff_id"
	}),
	stock_adjustmentInPortals_requested_by: many(stock_adjustmentInPortal, {
		relationName: "stock_adjustmentInPortal_requested_by_staff_masterInRef_staff_id"
	}),
	physical_countInPortals_counted_by: many(physical_countInPortal, {
		relationName: "physical_countInPortal_counted_by_staff_masterInRef_staff_id"
	}),
	physical_countInPortals_verified_by: many(physical_countInPortal, {
		relationName: "physical_countInPortal_verified_by_staff_masterInRef_staff_id"
	}),
	purchase_requisitionInPortals_finance_approval: many(purchase_requisitionInPortal, {
		relationName: "purchase_requisitionInPortal_finance_approval_staff_masterInRef_staff_id"
	}),
	purchase_requisitionInPortals_principal_approval: many(purchase_requisitionInPortal, {
		relationName: "purchase_requisitionInPortal_principal_approval_staff_masterInRef_staff_id"
	}),
	purchase_requisitionInPortals_stores_head_approval: many(purchase_requisitionInPortal, {
		relationName: "purchase_requisitionInPortal_stores_head_approval_staff_masterInRef_staff_id"
	}),
	vendor_evaluationInPortals: many(vendor_evaluationInPortal),
	vendor_rankingInPortals: many(vendor_rankingInPortal),
	purchase_orderInPortals: many(purchase_orderInPortal),
	po_amendmentInPortals: many(po_amendmentInPortal),
	po_conditionInPortals: many(po_conditionInPortal),
	po_alertInPortals: many(po_alertInPortal),
	approval_logInPortals: many(approval_logInPortal),
	gate_entryInPortals: many(gate_entryInPortal),
	quality_inspectionInPortals: many(quality_inspectionInPortal),
	deploymentInPortals: many(deploymentInPortal),
	commissioning_handoverInPortals_handed_over_to: many(commissioning_handoverInPortal, {
		relationName: "commissioning_handoverInPortal_handed_over_to_staff_masterInRef_staff_id"
	}),
	commissioning_handoverInPortals_tested_by: many(commissioning_handoverInPortal, {
		relationName: "commissioning_handoverInPortal_tested_by_staff_masterInRef_staff_id"
	}),
	asset_capitalisationInPortals: many(asset_capitalisationInPortal),
	asset_transferInPortals: many(asset_transferInPortal),
	budget_txnInPortals: many(budget_txnInPortal),
	vendor_invoiceInPortals_approved_by: many(vendor_invoiceInPortal, {
		relationName: "vendor_invoiceInPortal_approved_by_staff_masterInRef_staff_id"
	}),
	vendor_invoiceInPortals_verified_by: many(vendor_invoiceInPortal, {
		relationName: "vendor_invoiceInPortal_verified_by_staff_masterInRef_staff_id"
	}),
	po_paymentInPortals_approved_by: many(po_paymentInPortal, {
		relationName: "po_paymentInPortal_approved_by_staff_masterInRef_staff_id"
	}),
	po_paymentInPortals_prepared_by: many(po_paymentInPortal, {
		relationName: "po_paymentInPortal_prepared_by_staff_masterInRef_staff_id"
	}),
	journal_entryInPortals: many(journal_entryInPortal),
	vendor_performanceInPortals: many(vendor_performanceInPortal),
	approval_stepInShareds: many(approval_stepInShared),
	policy_settingInShareds: many(policy_settingInShared),
	documentInShareds: many(documentInShared),
	import_batchInShareds: many(import_batchInShared, {
		relationName: "import_batchInShared_processed_by_staff_masterInRef_staff_id"
	}),
	notificationInShareds: many(notificationInShared),
	mess_masterInHostels: many(mess_masterInHostel),
	discipline_caseInHostels: many(discipline_caseInHostel),
	discipline_punishmentInHostels: many(discipline_punishmentInHostel),
	no_dues_clearanceInHostels: many(no_dues_clearanceInHostel),
	hostel_allocationInHostels_approved_by: many(hostel_allocationInHostel, {
		relationName: "hostel_allocationInHostel_approved_by_staff_masterInRef_staff_id"
	}),
	hostel_allocationInHostels_checked_in_by: many(hostel_allocationInHostel, {
		relationName: "hostel_allocationInHostel_checked_in_by_staff_masterInRef_staff_id"
	}),
	hostel_allocationInHostels_staff_id: many(hostel_allocationInHostel, {
		relationName: "hostel_allocationInHostel_staff_id_staff_masterInRef_staff_id"
	}),
	room_offerInHostels: many(room_offerInHostel),
	room_handoverInHostels: many(room_handoverInHostel),
	staff_space_assignmentInHostels: many(staff_space_assignmentInHostel),
	electricity_tariffInHostels: many(electricity_tariffInHostel),
	fee_receiptInHostels: many(fee_receiptInHostel),
	meter_readingInHostels: many(meter_readingInHostel),
	tracking_consentInHostels: many(tracking_consentInHostel),
	hostel_alertInHostels: many(hostel_alertInHostel),
	location_access_logInHostels: many(location_access_logInHostel),
	sick_leaveInHostels_approved_by: many(sick_leaveInHostel, {
		relationName: "sick_leaveInHostel_approved_by_staff_masterInRef_staff_id"
	}),
	sick_leaveInHostels_visited_by: many(sick_leaveInHostel, {
		relationName: "sick_leaveInHostel_visited_by_staff_masterInRef_staff_id"
	}),
	movement_event_defaultInHostels: many(movement_event_defaultInHostel),
	staff_addressInRefs: many(staff_addressInRef),
	sick_meal_deliveryInHostels: many(sick_meal_deliveryInHostel),
}));

export const courseInRefRelations = relations(courseInRef, ({one, many}) => ({
	departmentInRef: one(departmentInRef, {
		fields: [courseInRef.dept_code],
		references: [departmentInRef.dept_code]
	}),
	sectionInRefs: many(sectionInRef),
	subjectInRefs: many(subjectInRef),
	student_masterInRefs: many(student_masterInRef),
}));

export const sectionInRefRelations = relations(sectionInRef, ({one, many}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [sectionInRef.class_advisor_id],
		references: [staff_masterInRef.staff_id]
	}),
	courseInRef: one(courseInRef, {
		fields: [sectionInRef.course_id],
		references: [courseInRef.course_id]
	}),
	batchInRefs: many(batchInRef),
	student_masterInRefs: many(student_masterInRef),
	class_allocationInInfras: many(class_allocationInInfra),
}));

export const batchInRefRelations = relations(batchInRef, ({one, many}) => ({
	sectionInRef: one(sectionInRef, {
		fields: [batchInRef.section_id],
		references: [sectionInRef.section_id]
	}),
	lab_allocationInInfras: many(lab_allocationInInfra),
}));

export const subjectInRefRelations = relations(subjectInRef, ({one, many}) => ({
	courseInRef: one(courseInRef, {
		fields: [subjectInRef.course_id],
		references: [courseInRef.course_id]
	}),
	class_allocationInInfras: many(class_allocationInInfra),
	lab_allocationInInfras: many(lab_allocationInInfra),
}));

export const staff_qualificationInRefRelations = relations(staff_qualificationInRef, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [staff_qualificationInRef.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const campusInInfraRelations = relations(campusInInfra, ({many}) => ({
	staff_masterInRefs: many(staff_masterInRef),
	facilityInInfras: many(facilityInInfra),
	locationInPortals: many(locationInPortal),
}));

export const import_batchInSharedRelations = relations(import_batchInShared, ({one, many}) => ({
	staff_masterInRefs: many(staff_masterInRef, {
		relationName: "staff_masterInRef_import_batch_id_import_batchInShared_batch_id"
	}),
	student_masterInRefs: many(student_masterInRef),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [import_batchInShared.processed_by],
		references: [staff_masterInRef.staff_id],
		relationName: "import_batchInShared_processed_by_staff_masterInRef_staff_id"
	}),
}));

export const staff_contactInRefRelations = relations(staff_contactInRef, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [staff_contactInRef.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const staff_dependentInRefRelations = relations(staff_dependentInRef, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [staff_dependentInRef.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const staff_employment_historyInRefRelations = relations(staff_employment_historyInRef, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [staff_employment_historyInRef.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const staff_membershipInRefRelations = relations(staff_membershipInRef, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [staff_membershipInRef.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const sportInRefRelations = relations(sportInRef, ({one, many}) => ({
	spaceInInfra: one(spaceInInfra, {
		fields: [sportInRef.default_space_id],
		references: [spaceInInfra.space_id]
	}),
	sports_membershipInInfras: many(sports_membershipInInfra),
}));

export const spaceInInfraRelations = relations(spaceInInfra, ({one, many}) => ({
	sportInRefs: many(sportInRef),
	zoneInInfra: one(zoneInInfra, {
		fields: [spaceInInfra.zone_id],
		references: [zoneInInfra.zone_id]
	}),
	subspaceInInfras: many(subspaceInInfra),
	asset_masterInInfras: many(asset_masterInInfra),
	class_allocationInInfras: many(class_allocationInInfra),
	lab_allocationInInfras: many(lab_allocationInInfra),
	activity_bookingInInfras: many(activity_bookingInInfra),
	space_availability_logInInfras: many(space_availability_logInInfra),
	maintenance_ticketInInfras: many(maintenance_ticketInInfra),
	inspection_logInInfras: many(inspection_logInInfra),
	pm_scheduleInInfras: many(pm_scheduleInInfra),
	locationInPortals: many(locationInPortal),
	indentInPortals: many(indentInPortal),
	material_issueInPortals: many(material_issueInPortal),
	dept_consumptionInPortals: many(dept_consumptionInPortal),
	stock_returnInPortals: many(stock_returnInPortal),
	pr_lineInPortals: many(pr_lineInPortal),
	deploymentInPortals: many(deploymentInPortal),
	assetInPortals: many(assetInPortal),
	asset_capitalisationInPortals: many(asset_capitalisationInPortal),
	asset_transferInPortals_from_space_id: many(asset_transferInPortal, {
		relationName: "asset_transferInPortal_from_space_id_spaceInInfra_space_id"
	}),
	asset_transferInPortals_to_space_id: many(asset_transferInPortal, {
		relationName: "asset_transferInPortal_to_space_id_spaceInInfra_space_id"
	}),
	mess_masterInHostels: many(mess_masterInHostel),
	room_profileInHostels: many(room_profileInHostel),
	staff_space_assignmentInHostels: many(staff_space_assignmentInHostel),
	space_qrInHostels: many(space_qrInHostel),
	room_meterInHostels: many(room_meterInHostel),
	capture_pointInHostels: many(capture_pointInHostel),
	po_lineInPortals: many(po_lineInPortal),
}));

export const staff_responsibilityInRefRelations = relations(staff_responsibilityInRef, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [staff_responsibilityInRef.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const student_masterInRefRelations = relations(student_masterInRef, ({one, many}) => ({
	import_batchInShared: one(import_batchInShared, {
		fields: [student_masterInRef.import_batch_id],
		references: [import_batchInShared.batch_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [student_masterInRef.counsellor_id],
		references: [staff_masterInRef.staff_id]
	}),
	courseInRef: one(courseInRef, {
		fields: [student_masterInRef.course_id],
		references: [courseInRef.course_id]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [student_masterInRef.dept_code],
		references: [departmentInRef.dept_code]
	}),
	sectionInRef: one(sectionInRef, {
		fields: [student_masterInRef.section_id],
		references: [sectionInRef.section_id]
	}),
	lab_workstation_mapInInfras: many(lab_workstation_mapInInfra),
	sports_membershipInInfras: many(sports_membershipInInfra),
	documentInShareds: many(documentInShared),
	notificationInShareds: many(notificationInShared),
	student_contactInHostels: many(student_contactInHostel),
	mess_subscriptionInHostels: many(mess_subscriptionInHostel),
	discipline_caseInHostels: many(discipline_caseInHostel),
	discipline_punishmentInHostels: many(discipline_punishmentInHostel),
	vacate_requestInHostels: many(vacate_requestInHostel),
	hostel_registrationInHostels: many(hostel_registrationInHostel),
	hostel_allocationInHostels: many(hostel_allocationInHostel),
	fee_demandInHostels: many(fee_demandInHostel),
	meter_rechargeInHostels: many(meter_rechargeInHostel),
	tracking_consentInHostels: many(tracking_consentInHostel),
	student_current_statusInHostels: many(student_current_statusInHostel),
	hostel_alertInHostels: many(hostel_alertInHostel),
	location_access_logInHostels: many(location_access_logInHostel),
	sick_leaveInHostels: many(sick_leaveInHostel),
	outpassInHostels: many(outpassInHostel),
	movement_event_defaultInHostels: many(movement_event_defaultInHostel),
	student_addressInRefs: many(student_addressInRef),
}));

export const facilityInInfraRelations = relations(facilityInInfra, ({one, many}) => ({
	campusInInfra: one(campusInInfra, {
		fields: [facilityInInfra.campus_id],
		references: [campusInInfra.campus_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [facilityInInfra.incharge_id],
		references: [staff_masterInRef.staff_id]
	}),
	zoneInInfras: many(zoneInInfra),
	maintenance_ticketInInfras: many(maintenance_ticketInInfra),
	inspection_logInInfras: many(inspection_logInInfra),
	utility_consumptionInInfras: many(utility_consumptionInInfra),
	locationInPortals: many(locationInPortal),
	indentInPortals: many(indentInPortal),
	purchase_orderInPortals: many(purchase_orderInPortal),
	deploymentInPortals: many(deploymentInPortal),
	mess_masterInHostels: many(mess_masterInHostel),
	hostel_profileInHostels: many(hostel_profileInHostel),
	capture_pointInHostels: many(capture_pointInHostel),
}));

export const zoneInInfraRelations = relations(zoneInInfra, ({one, many}) => ({
	facilityInInfra: one(facilityInInfra, {
		fields: [zoneInInfra.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	spaceInInfras: many(spaceInInfra),
	staff_space_assignmentInHostels: many(staff_space_assignmentInHostel),
	capture_pointInHostels: many(capture_pointInHostel),
}));

export const subspaceInInfraRelations = relations(subspaceInInfra, ({one, many}) => ({
	spaceInInfra: one(spaceInInfra, {
		fields: [subspaceInInfra.space_id],
		references: [spaceInInfra.space_id]
	}),
	lab_workstation_mapInInfras: many(lab_workstation_mapInInfra),
	deploymentInPortals: many(deploymentInPortal),
	hostel_allocationInHostels: many(hostel_allocationInHostel),
	room_offerInHostels: many(room_offerInHostel),
}));

export const asset_masterInInfraRelations = relations(asset_masterInInfra, ({one, many}) => ({
	spaceInInfra: one(spaceInInfra, {
		fields: [asset_masterInInfra.space_id],
		references: [spaceInInfra.space_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [asset_masterInInfra.sku],
		references: [materialInPortal.sku]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [asset_masterInInfra.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	maintenance_ticketInInfras: many(maintenance_ticketInInfra),
	pm_scheduleInInfras: many(pm_scheduleInInfra),
	amc_contractInInfras: many(amc_contractInInfra),
	serialised_stockInPortals: many(serialised_stockInPortal),
	scrap_returnInPortals: many(scrap_returnInPortal),
	assetInPortals: many(assetInPortal),
	asset_capitalisationInPortals: many(asset_capitalisationInPortal),
	asset_transferInPortals: many(asset_transferInPortal),
	room_meterInHostels: many(room_meterInHostel),
	room_handover_lineInHostels: many(room_handover_lineInHostel),
	material_issue_lineInPortals: many(material_issue_lineInPortal),
}));

export const materialInPortalRelations = relations(materialInPortal, ({one, many}) => ({
	asset_masterInInfras: many(asset_masterInInfra),
	work_order_partInInfras: many(work_order_partInInfra),
	unit_of_measureInPortal_alt_unit: one(unit_of_measureInPortal, {
		fields: [materialInPortal.alt_unit],
		references: [unit_of_measureInPortal.uom],
		relationName: "materialInPortal_alt_unit_unit_of_measureInPortal_uom"
	}),
	unit_of_measureInPortal_base_unit: one(unit_of_measureInPortal, {
		fields: [materialInPortal.base_unit],
		references: [unit_of_measureInPortal.uom],
		relationName: "materialInPortal_base_unit_unit_of_measureInPortal_uom"
	}),
	categoryInPortal: one(categoryInPortal, {
		fields: [materialInPortal.category_code],
		references: [categoryInPortal.category_code]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [materialInPortal.custodian_dept_code],
		references: [departmentInRef.dept_code]
	}),
	hsn_sacInPortal: one(hsn_sacInPortal, {
		fields: [materialInPortal.hsn_sac_code],
		references: [hsn_sacInPortal.hsn_sac_code]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [materialInPortal.preferred_supplier_code],
		references: [vendorInPortal.vendor_id]
	}),
	ledgerInPortal_purchase_ledger_code: one(ledgerInPortal, {
		fields: [materialInPortal.purchase_ledger_code],
		references: [ledgerInPortal.ledger_code],
		relationName: "materialInPortal_purchase_ledger_code_ledgerInPortal_ledger_code"
	}),
	ledgerInPortal_sales_ledger_code: one(ledgerInPortal, {
		fields: [materialInPortal.sales_ledger_code],
		references: [ledgerInPortal.ledger_code],
		relationName: "materialInPortal_sales_ledger_code_ledgerInPortal_ledger_code"
	}),
	stock_groupInPortal: one(stock_groupInPortal, {
		fields: [materialInPortal.stock_group_code],
		references: [stock_groupInPortal.group_code]
	}),
	sub_categoryInPortal: one(sub_categoryInPortal, {
		fields: [materialInPortal.sub_category_id],
		references: [sub_categoryInPortal.sub_category_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [materialInPortal.substitute_sku],
		references: [materialInPortal.sku],
		relationName: "materialInPortal_substitute_sku_materialInPortal_sku"
	}),
	materialInPortals: many(materialInPortal, {
		relationName: "materialInPortal_substitute_sku_materialInPortal_sku"
	}),
	batchInPortals: many(batchInPortal),
	serialised_stockInPortals: many(serialised_stockInPortal),
	vendor_itemInPortals: many(vendor_itemInPortal),
	reorder_ruleInPortals: many(reorder_ruleInPortal),
	stock_movementInPortals: many(stock_movementInPortal),
	scrap_returnInPortals: many(scrap_returnInPortal),
	dept_consumptionInPortals: many(dept_consumptionInPortal),
	receiptInPortals: many(receiptInPortal),
	stock_entryInPortals: many(stock_entryInPortal),
	stock_transfer_lineInPortals: many(stock_transfer_lineInPortal),
	stock_adjustmentInPortals: many(stock_adjustmentInPortal),
	physical_count_lineInPortals: many(physical_count_lineInPortal),
	new_requestInPortals: many(new_requestInPortal),
	pr_lineInPortals: many(pr_lineInPortal),
	rfqInPortals: many(rfqInPortal),
	return_to_vendorInPortals: many(return_to_vendorInPortal),
	deploymentInPortals: many(deploymentInPortal),
	assetInPortals: many(assetInPortal),
	asset_capitalisationInPortals: many(asset_capitalisationInPortal),
	amc_renewalInPortals: many(amc_renewalInPortal),
	vendor_invoice_lineInPortals: many(vendor_invoice_lineInPortal),
	material_aliasInPortals: many(material_aliasInPortal),
	bom_componentInPortals_component_sku: many(bom_componentInPortal, {
		relationName: "bom_componentInPortal_component_sku_materialInPortal_sku"
	}),
	bom_componentInPortals_parent_sku: many(bom_componentInPortal, {
		relationName: "bom_componentInPortal_parent_sku_materialInPortal_sku"
	}),
	room_standard_inventoryInHostels: many(room_standard_inventoryInHostel),
	material_standard_rateInPortals: many(material_standard_rateInPortal),
	stock_reservationInPortals: many(stock_reservationInPortal),
	equipment_coverInPortals: many(equipment_coverInPortal),
	stock_check_lineInPortals: many(stock_check_lineInPortal),
	material_issue_lineInPortals: many(material_issue_lineInPortal),
	stock_sheet_lineInPortals: many(stock_sheet_lineInPortal),
	stockInPortals: many(stockInPortal),
	indent_lineInPortals: many(indent_lineInPortal),
	po_lineInPortals: many(po_lineInPortal),
}));

export const vendorInPortalRelations = relations(vendorInPortal, ({many}) => ({
	asset_masterInInfras: many(asset_masterInInfra),
	work_orderInInfras: many(work_orderInInfra),
	amc_contractInInfras: many(amc_contractInInfra),
	materialInPortals: many(materialInPortal),
	vendor_itemInPortals: many(vendor_itemInPortal),
	transporterInPortals: many(transporterInPortal),
	purchase_orderInPortals: many(purchase_orderInPortal),
	shipmentInPortals: many(shipmentInPortal),
	return_to_vendorInPortals: many(return_to_vendorInPortal),
	deploymentInPortals: many(deploymentInPortal),
	vendor_invoiceInPortals: many(vendor_invoiceInPortal),
	po_paymentInPortals: many(po_paymentInPortal),
	advance_paymentInPortals: many(advance_paymentInPortal),
	debit_noteInPortals: many(debit_noteInPortal),
	vendor_performanceInPortals: many(vendor_performanceInPortal),
	vendor_categoryInPortals: many(vendor_categoryInPortal),
	vendor_tagInPortals: many(vendor_tagInPortal),
	rfq_vendorInPortals: many(rfq_vendorInPortal),
	rfq_bidInPortals: many(rfq_bidInPortal),
}));

export const class_allocationInInfraRelations = relations(class_allocationInInfra, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [class_allocationInInfra.faculty_id],
		references: [staff_masterInRef.staff_id]
	}),
	sectionInRef: one(sectionInRef, {
		fields: [class_allocationInInfra.section_id],
		references: [sectionInRef.section_id]
	}),
	timetable_slotInInfra: one(timetable_slotInInfra, {
		fields: [class_allocationInInfra.slot_id],
		references: [timetable_slotInInfra.slot_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [class_allocationInInfra.space_id],
		references: [spaceInInfra.space_id]
	}),
	subjectInRef: one(subjectInRef, {
		fields: [class_allocationInInfra.subject_id],
		references: [subjectInRef.subject_id]
	}),
}));

export const timetable_slotInInfraRelations = relations(timetable_slotInInfra, ({many}) => ({
	class_allocationInInfras: many(class_allocationInInfra),
	lab_allocationInInfras: many(lab_allocationInInfra),
}));

export const lab_allocationInInfraRelations = relations(lab_allocationInInfra, ({one, many}) => ({
	batchInRef: one(batchInRef, {
		fields: [lab_allocationInInfra.batch_id],
		references: [batchInRef.batch_id]
	}),
	staff_masterInRef_faculty_id: one(staff_masterInRef, {
		fields: [lab_allocationInInfra.faculty_id],
		references: [staff_masterInRef.staff_id],
		relationName: "lab_allocationInInfra_faculty_id_staff_masterInRef_staff_id"
	}),
	staff_masterInRef_lab_assistant_id: one(staff_masterInRef, {
		fields: [lab_allocationInInfra.lab_assistant_id],
		references: [staff_masterInRef.staff_id],
		relationName: "lab_allocationInInfra_lab_assistant_id_staff_masterInRef_staff_id"
	}),
	timetable_slotInInfra: one(timetable_slotInInfra, {
		fields: [lab_allocationInInfra.slot_id],
		references: [timetable_slotInInfra.slot_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [lab_allocationInInfra.space_id],
		references: [spaceInInfra.space_id]
	}),
	subjectInRef: one(subjectInRef, {
		fields: [lab_allocationInInfra.subject_id],
		references: [subjectInRef.subject_id]
	}),
	lab_workstation_mapInInfras: many(lab_workstation_mapInInfra),
}));

export const lab_workstation_mapInInfraRelations = relations(lab_workstation_mapInInfra, ({one}) => ({
	lab_allocationInInfra: one(lab_allocationInInfra, {
		fields: [lab_workstation_mapInInfra.lab_alloc_id],
		references: [lab_allocationInInfra.lab_alloc_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [lab_workstation_mapInInfra.student_id],
		references: [student_masterInRef.student_id]
	}),
	subspaceInInfra: one(subspaceInInfra, {
		fields: [lab_workstation_mapInInfra.subspace_id],
		references: [subspaceInInfra.subspace_id]
	}),
}));

export const activity_bookingInInfraRelations = relations(activity_bookingInInfra, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [activity_bookingInInfra.approved_by],
		references: [staff_masterInRef.staff_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [activity_bookingInInfra.space_id],
		references: [spaceInInfra.space_id]
	}),
}));

export const sports_membershipInInfraRelations = relations(sports_membershipInInfra, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [sports_membershipInInfra.coach_id],
		references: [staff_masterInRef.staff_id]
	}),
	sportInRef: one(sportInRef, {
		fields: [sports_membershipInInfra.sport_id],
		references: [sportInRef.sport_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [sports_membershipInInfra.student_id],
		references: [student_masterInRef.student_id]
	}),
}));

export const space_availability_logInInfraRelations = relations(space_availability_logInInfra, ({one}) => ({
	spaceInInfra: one(spaceInInfra, {
		fields: [space_availability_logInInfra.space_id],
		references: [spaceInInfra.space_id]
	}),
}));

export const maintenance_categoryInInfraRelations = relations(maintenance_categoryInInfra, ({one, many}) => ({
	maintenance_teamInInfra: one(maintenance_teamInInfra, {
		fields: [maintenance_categoryInInfra.default_team_id],
		references: [maintenance_teamInInfra.team_id],
		relationName: "maintenance_categoryInInfra_default_team_id_maintenance_teamInInfra_team_id"
	}),
	maintenance_teamInInfras: many(maintenance_teamInInfra, {
		relationName: "maintenance_teamInInfra_category_id_maintenance_categoryInInfra_category_id"
	}),
	maintenance_ticketInInfras: many(maintenance_ticketInInfra),
	pm_scheduleInInfras: many(pm_scheduleInInfra),
}));

export const maintenance_teamInInfraRelations = relations(maintenance_teamInInfra, ({one, many}) => ({
	maintenance_categoryInInfras: many(maintenance_categoryInInfra, {
		relationName: "maintenance_categoryInInfra_default_team_id_maintenance_teamInInfra_team_id"
	}),
	maintenance_categoryInInfra: one(maintenance_categoryInInfra, {
		fields: [maintenance_teamInInfra.category_id],
		references: [maintenance_categoryInInfra.category_id],
		relationName: "maintenance_teamInInfra_category_id_maintenance_categoryInInfra_category_id"
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [maintenance_teamInInfra.supervisor_id],
		references: [staff_masterInRef.staff_id]
	}),
	technicianInInfras: many(technicianInInfra),
	pm_scheduleInInfras: many(pm_scheduleInInfra),
}));

export const technicianInInfraRelations = relations(technicianInInfra, ({one, many}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [technicianInInfra.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
	maintenance_teamInInfra: one(maintenance_teamInInfra, {
		fields: [technicianInInfra.team_id],
		references: [maintenance_teamInInfra.team_id]
	}),
	maintenance_ticketInInfras: many(maintenance_ticketInInfra),
	work_orderInInfras: many(work_orderInInfra),
	deploymentInPortals: many(deploymentInPortal),
}));

export const maintenance_ticketInInfraRelations = relations(maintenance_ticketInInfra, ({one, many}) => ({
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [maintenance_ticketInInfra.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	technicianInInfra: one(technicianInInfra, {
		fields: [maintenance_ticketInInfra.assigned_to],
		references: [technicianInInfra.technician_id]
	}),
	maintenance_categoryInInfra: one(maintenance_categoryInInfra, {
		fields: [maintenance_ticketInInfra.category_id],
		references: [maintenance_categoryInInfra.category_id]
	}),
	facilityInInfra: one(facilityInInfra, {
		fields: [maintenance_ticketInInfra.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	maintenance_ticketInInfra: one(maintenance_ticketInInfra, {
		fields: [maintenance_ticketInInfra.follow_up_of],
		references: [maintenance_ticketInInfra.ticket_id],
		relationName: "maintenance_ticketInInfra_follow_up_of_maintenance_ticketInInfra_ticket_id"
	}),
	maintenance_ticketInInfras: many(maintenance_ticketInInfra, {
		relationName: "maintenance_ticketInInfra_follow_up_of_maintenance_ticketInInfra_ticket_id"
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [maintenance_ticketInInfra.space_id],
		references: [spaceInInfra.space_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [maintenance_ticketInInfra.verified_by],
		references: [staff_masterInRef.staff_id]
	}),
	inspection_logInInfras: many(inspection_logInInfra),
	work_orderInInfras: many(work_orderInInfra),
	indentInPortals: many(indentInPortal),
	material_issueInPortals: many(material_issueInPortal),
	deploymentInPortals: many(deploymentInPortal),
	service_ticketInPortals: many(service_ticketInPortal),
}));

export const inspection_logInInfraRelations = relations(inspection_logInInfra, ({one}) => ({
	facilityInInfra: one(facilityInInfra, {
		fields: [inspection_logInInfra.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [inspection_logInInfra.space_id],
		references: [spaceInInfra.space_id]
	}),
	maintenance_ticketInInfra: one(maintenance_ticketInInfra, {
		fields: [inspection_logInInfra.ticket_id],
		references: [maintenance_ticketInInfra.ticket_id]
	}),
}));

export const pm_scheduleInInfraRelations = relations(pm_scheduleInInfra, ({one, many}) => ({
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [pm_scheduleInInfra.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	maintenance_teamInInfra: one(maintenance_teamInInfra, {
		fields: [pm_scheduleInInfra.assigned_team_id],
		references: [maintenance_teamInInfra.team_id]
	}),
	maintenance_categoryInInfra: one(maintenance_categoryInInfra, {
		fields: [pm_scheduleInInfra.category_id],
		references: [maintenance_categoryInInfra.category_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [pm_scheduleInInfra.space_id],
		references: [spaceInInfra.space_id]
	}),
	work_orderInInfras: many(work_orderInInfra),
}));

export const work_orderInInfraRelations = relations(work_orderInInfra, ({one, many}) => ({
	vendorInPortal: one(vendorInPortal, {
		fields: [work_orderInInfra.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	pm_scheduleInInfra: one(pm_scheduleInInfra, {
		fields: [work_orderInInfra.pm_schedule_id],
		references: [pm_scheduleInInfra.pm_schedule_id]
	}),
	technicianInInfra: one(technicianInInfra, {
		fields: [work_orderInInfra.technician_id],
		references: [technicianInInfra.technician_id]
	}),
	maintenance_ticketInInfra: one(maintenance_ticketInInfra, {
		fields: [work_orderInInfra.ticket_id],
		references: [maintenance_ticketInInfra.ticket_id]
	}),
	work_order_partInInfras: many(work_order_partInInfra),
	indentInPortals: many(indentInPortal),
}));

export const work_order_partInInfraRelations = relations(work_order_partInInfra, ({one}) => ({
	materialInPortal: one(materialInPortal, {
		fields: [work_order_partInInfra.sku],
		references: [materialInPortal.sku]
	}),
	work_orderInInfra: one(work_orderInInfra, {
		fields: [work_order_partInInfra.work_order_id],
		references: [work_orderInInfra.work_order_id]
	}),
}));

export const amc_contractInInfraRelations = relations(amc_contractInInfra, ({one, many}) => ({
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [amc_contractInInfra.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [amc_contractInInfra.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	commissioning_handoverInPortals: many(commissioning_handoverInPortal),
	amc_renewalInPortals: many(amc_renewalInPortal),
}));

export const utility_consumptionInInfraRelations = relations(utility_consumptionInInfra, ({one}) => ({
	facilityInInfra: one(facilityInInfra, {
		fields: [utility_consumptionInInfra.facility_id],
		references: [facilityInInfra.facility_id]
	}),
}));

export const app_userInPortalRelations = relations(app_userInPortal, ({one, many}) => ({
	departmentInRef: one(departmentInRef, {
		fields: [app_userInPortal.home_dept],
		references: [departmentInRef.dept_code]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [app_userInPortal.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
	stock_movementInPortals: many(stock_movementInPortal),
	indentInPortals: many(indentInPortal),
	stock_checkInPortals: many(stock_checkInPortal),
	scrap_returnInPortals: many(scrap_returnInPortal),
	material_issueInPortals_collected_by: many(material_issueInPortal, {
		relationName: "material_issueInPortal_collected_by_app_userInPortal_user_id"
	}),
	material_issueInPortals_issued_by: many(material_issueInPortal, {
		relationName: "material_issueInPortal_issued_by_app_userInPortal_user_id"
	}),
	receiptInPortals_owner_id: many(receiptInPortal, {
		relationName: "receiptInPortal_owner_id_app_userInPortal_user_id"
	}),
	receiptInPortals_verified_by: many(receiptInPortal, {
		relationName: "receiptInPortal_verified_by_app_userInPortal_user_id"
	}),
	stock_entryInPortals: many(stock_entryInPortal),
	new_requestInPortals: many(new_requestInPortal),
	rfqInPortals: many(rfqInPortal),
	purchase_orderInPortals_deleted_by: many(purchase_orderInPortal, {
		relationName: "purchase_orderInPortal_deleted_by_app_userInPortal_user_id"
	}),
	purchase_orderInPortals_prepared_by: many(purchase_orderInPortal, {
		relationName: "purchase_orderInPortal_prepared_by_app_userInPortal_user_id"
	}),
	grnInPortals: many(grnInPortal),
	amc_renewalInPortals: many(amc_renewalInPortal),
	service_ticketInPortals: many(service_ticketInPortal),
	deployment_eventInPortals: many(deployment_eventInPortal),
	amc_renewal_decisionInPortals: many(amc_renewal_decisionInPortal),
	user_roleInPortals: many(user_roleInPortal),
	indent_eventInPortals: many(indent_eventInPortal),
	new_request_eventInPortals: many(new_request_eventInPortal),
	po_eventInPortals: many(po_eventInPortal),
}));

export const categoryInPortalRelations = relations(categoryInPortal, ({one, many}) => ({
	categoryInPortal: one(categoryInPortal, {
		fields: [categoryInPortal.parent_category_code],
		references: [categoryInPortal.category_code],
		relationName: "categoryInPortal_parent_category_code_categoryInPortal_category_code"
	}),
	categoryInPortals: many(categoryInPortal, {
		relationName: "categoryInPortal_parent_category_code_categoryInPortal_category_code"
	}),
	gl_accountInPortal: one(gl_accountInPortal, {
		fields: [categoryInPortal.default_gl_account_id],
		references: [gl_accountInPortal.gl_account_id]
	}),
	sub_categoryInPortals: many(sub_categoryInPortal),
	materialInPortals: many(materialInPortal),
	new_requestInPortals: many(new_requestInPortal),
	vendor_categoryInPortals: many(vendor_categoryInPortal),
}));

export const gl_accountInPortalRelations = relations(gl_accountInPortal, ({one, many}) => ({
	categoryInPortals: many(categoryInPortal),
	gl_accountInPortal: one(gl_accountInPortal, {
		fields: [gl_accountInPortal.parent_account_id],
		references: [gl_accountInPortal.gl_account_id],
		relationName: "gl_accountInPortal_parent_account_id_gl_accountInPortal_gl_account_id"
	}),
	gl_accountInPortals: many(gl_accountInPortal, {
		relationName: "gl_accountInPortal_parent_account_id_gl_accountInPortal_gl_account_id"
	}),
	ledgerInPortals: many(ledgerInPortal),
	tax_masterInPortals: many(tax_masterInPortal),
	budget_headInPortals: many(budget_headInPortal),
	asset_capitalisationInPortals: many(asset_capitalisationInPortal),
	vendor_invoice_lineInPortals: many(vendor_invoice_lineInPortal),
	journal_lineInPortals: many(journal_lineInPortal),
}));

export const sub_categoryInPortalRelations = relations(sub_categoryInPortal, ({one, many}) => ({
	categoryInPortal: one(categoryInPortal, {
		fields: [sub_categoryInPortal.category_code],
		references: [categoryInPortal.category_code]
	}),
	materialInPortals: many(materialInPortal),
}));

export const stock_groupInPortalRelations = relations(stock_groupInPortal, ({one, many}) => ({
	stock_groupInPortal: one(stock_groupInPortal, {
		fields: [stock_groupInPortal.parent_group_code],
		references: [stock_groupInPortal.group_code],
		relationName: "stock_groupInPortal_parent_group_code_stock_groupInPortal_group_code"
	}),
	stock_groupInPortals: many(stock_groupInPortal, {
		relationName: "stock_groupInPortal_parent_group_code_stock_groupInPortal_group_code"
	}),
	materialInPortals: many(materialInPortal),
}));

export const unit_of_measureInPortalRelations = relations(unit_of_measureInPortal, ({one, many}) => ({
	unit_of_measureInPortal: one(unit_of_measureInPortal, {
		fields: [unit_of_measureInPortal.base_uom],
		references: [unit_of_measureInPortal.uom],
		relationName: "unit_of_measureInPortal_base_uom_unit_of_measureInPortal_uom"
	}),
	unit_of_measureInPortals: many(unit_of_measureInPortal, {
		relationName: "unit_of_measureInPortal_base_uom_unit_of_measureInPortal_uom"
	}),
	materialInPortals_alt_unit: many(materialInPortal, {
		relationName: "materialInPortal_alt_unit_unit_of_measureInPortal_uom"
	}),
	materialInPortals_base_unit: many(materialInPortal, {
		relationName: "materialInPortal_base_unit_unit_of_measureInPortal_uom"
	}),
	new_requestInPortals: many(new_requestInPortal),
	pr_lineInPortals: many(pr_lineInPortal),
	indent_lineInPortals: many(indent_lineInPortal),
	po_lineInPortals: many(po_lineInPortal),
}));

export const ledgerInPortalRelations = relations(ledgerInPortal, ({one, many}) => ({
	gl_accountInPortal: one(gl_accountInPortal, {
		fields: [ledgerInPortal.gl_account_id],
		references: [gl_accountInPortal.gl_account_id]
	}),
	materialInPortals_purchase_ledger_code: many(materialInPortal, {
		relationName: "materialInPortal_purchase_ledger_code_ledgerInPortal_ledger_code"
	}),
	materialInPortals_sales_ledger_code: many(materialInPortal, {
		relationName: "materialInPortal_sales_ledger_code_ledgerInPortal_ledger_code"
	}),
}));

export const hsn_sacInPortalRelations = relations(hsn_sacInPortal, ({many}) => ({
	materialInPortals: many(materialInPortal),
}));

export const batchInPortalRelations = relations(batchInPortal, ({one, many}) => ({
	materialInPortal: one(materialInPortal, {
		fields: [batchInPortal.sku],
		references: [materialInPortal.sku]
	}),
	stock_movementInPortals: many(stock_movementInPortal),
	stock_transfer_lineInPortals: many(stock_transfer_lineInPortal),
	grnInPortals: many(grnInPortal),
	opening_stockInPortals: many(opening_stockInPortal),
	material_issue_lineInPortals: many(material_issue_lineInPortal),
	stockInPortals: many(stockInPortal),
}));

export const locationInPortalRelations = relations(locationInPortal, ({one, many}) => ({
	campusInInfra: one(campusInInfra, {
		fields: [locationInPortal.campus_id],
		references: [campusInInfra.campus_id]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [locationInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	facilityInInfra: one(facilityInInfra, {
		fields: [locationInPortal.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	locationInPortal: one(locationInPortal, {
		fields: [locationInPortal.parent_location_code],
		references: [locationInPortal.location_code],
		relationName: "locationInPortal_parent_location_code_locationInPortal_location_code"
	}),
	locationInPortals: many(locationInPortal, {
		relationName: "locationInPortal_parent_location_code_locationInPortal_location_code"
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [locationInPortal.space_id],
		references: [spaceInInfra.space_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [locationInPortal.store_keeper_id],
		references: [staff_masterInRef.staff_id]
	}),
	binInPortals: many(binInPortal),
	serialised_stockInPortals: many(serialised_stockInPortal),
	reorder_ruleInPortals: many(reorder_ruleInPortal),
	indentInPortals: many(indentInPortal),
	stock_transferInPortals_from_location: many(stock_transferInPortal, {
		relationName: "stock_transferInPortal_from_location_locationInPortal_location_code"
	}),
	stock_transferInPortals_to_location: many(stock_transferInPortal, {
		relationName: "stock_transferInPortal_to_location_locationInPortal_location_code"
	}),
	material_issueInPortals: many(material_issueInPortal),
	stock_returnInPortals: many(stock_returnInPortal),
	stock_adjustmentInPortals: many(stock_adjustmentInPortal),
	physical_countInPortals: many(physical_countInPortal),
	pr_lineInPortals: many(pr_lineInPortal),
	purchase_requisitionInPortals: many(purchase_requisitionInPortal),
	purchase_orderInPortals: many(purchase_orderInPortal),
	grnInPortals: many(grnInPortal),
	amc_renewalInPortals: many(amc_renewalInPortal),
	hostel_profileInHostels: many(hostel_profileInHostel),
	opening_stockInPortals: many(opening_stockInPortal),
	equipment_coverInPortals: many(equipment_coverInPortal),
}));

export const binInPortalRelations = relations(binInPortal, ({one, many}) => ({
	locationInPortal: one(locationInPortal, {
		fields: [binInPortal.location_code],
		references: [locationInPortal.location_code]
	}),
	stock_movementInPortals: many(stock_movementInPortal),
	receiptInPortals: many(receiptInPortal),
	stock_entryInPortals: many(stock_entryInPortal),
	stock_adjustmentInPortals: many(stock_adjustmentInPortal),
	physical_count_lineInPortals: many(physical_count_lineInPortal),
	grnInPortals: many(grnInPortal),
	deploymentInPortals: many(deploymentInPortal),
	stock_reservationInPortals: many(stock_reservationInPortal),
	material_issue_lineInPortals: many(material_issue_lineInPortal),
	stockInPortals: many(stockInPortal),
}));

export const serialised_stockInPortalRelations = relations(serialised_stockInPortal, ({one}) => ({
	grnInPortal: one(grnInPortal, {
		fields: [serialised_stockInPortal.grn_id],
		references: [grnInPortal.grn_id]
	}),
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [serialised_stockInPortal.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	locationInPortal: one(locationInPortal, {
		fields: [serialised_stockInPortal.location_code],
		references: [locationInPortal.location_code]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [serialised_stockInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const grnInPortalRelations = relations(grnInPortal, ({one, many}) => ({
	serialised_stockInPortals: many(serialised_stockInPortal),
	stock_movementInPortals: many(stock_movementInPortal),
	batchInPortal: one(batchInPortal, {
		fields: [grnInPortal.batch_id],
		references: [batchInPortal.batch_id]
	}),
	binInPortal: one(binInPortal, {
		fields: [grnInPortal.bin_code],
		references: [binInPortal.bin_code]
	}),
	gate_entryInPortal: one(gate_entryInPortal, {
		fields: [grnInPortal.gate_entry_id],
		references: [gate_entryInPortal.gate_entry_id]
	}),
	po_lineInPortal: one(po_lineInPortal, {
		fields: [grnInPortal.po_id],
		references: [po_lineInPortal.po_id]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [grnInPortal.received_by],
		references: [app_userInPortal.user_id]
	}),
	locationInPortal: one(locationInPortal, {
		fields: [grnInPortal.receiving_location],
		references: [locationInPortal.location_code]
	}),
	shipmentInPortal: one(shipmentInPortal, {
		fields: [grnInPortal.shipment_id],
		references: [shipmentInPortal.shipment_id]
	}),
	quality_inspectionInPortals: many(quality_inspectionInPortal),
	return_to_vendorInPortals_grn_id: many(return_to_vendorInPortal, {
		relationName: "return_to_vendorInPortal_grn_id_grnInPortal_grn_id"
	}),
	return_to_vendorInPortals_replacement_grn_id: many(return_to_vendorInPortal, {
		relationName: "return_to_vendorInPortal_replacement_grn_id_grnInPortal_grn_id"
	}),
	deploymentInPortals: many(deploymentInPortal),
	assetInPortals: many(assetInPortal),
	asset_capitalisationInPortals: many(asset_capitalisationInPortal),
	vendor_invoiceInPortals: many(vendor_invoiceInPortal),
	vendor_invoice_lineInPortals: many(vendor_invoice_lineInPortal),
}));

export const vendor_itemInPortalRelations = relations(vendor_itemInPortal, ({one}) => ({
	materialInPortal: one(materialInPortal, {
		fields: [vendor_itemInPortal.sku],
		references: [materialInPortal.sku]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [vendor_itemInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
}));

export const transporterInPortalRelations = relations(transporterInPortal, ({one, many}) => ({
	vendorInPortal: one(vendorInPortal, {
		fields: [transporterInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	shipmentInPortals: many(shipmentInPortal),
	return_to_vendorInPortals: many(return_to_vendorInPortal),
}));

export const tax_masterInPortalRelations = relations(tax_masterInPortal, ({one}) => ({
	gl_accountInPortal: one(gl_accountInPortal, {
		fields: [tax_masterInPortal.gl_account_id],
		references: [gl_accountInPortal.gl_account_id]
	}),
}));

export const budget_headInPortalRelations = relations(budget_headInPortal, ({one, many}) => ({
	departmentInRef: one(departmentInRef, {
		fields: [budget_headInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	gl_accountInPortal: one(gl_accountInPortal, {
		fields: [budget_headInPortal.gl_account_id],
		references: [gl_accountInPortal.gl_account_id]
	}),
	indentInPortals: many(indentInPortal),
	purchase_requisitionInPortals: many(purchase_requisitionInPortal),
	purchase_orderInPortals: many(purchase_orderInPortal),
	budget_txnInPortals: many(budget_txnInPortal),
	vendor_invoice_lineInPortals: many(vendor_invoice_lineInPortal),
	journal_lineInPortals: many(journal_lineInPortal),
}));

export const reorder_ruleInPortalRelations = relations(reorder_ruleInPortal, ({one}) => ({
	locationInPortal: one(locationInPortal, {
		fields: [reorder_ruleInPortal.location_code],
		references: [locationInPortal.location_code]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [reorder_ruleInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const approval_authority_matrixInPortalRelations = relations(approval_authority_matrixInPortal, ({one}) => ({
	roleInPortal_level_1_role: one(roleInPortal, {
		fields: [approval_authority_matrixInPortal.level_1_role],
		references: [roleInPortal.role_code],
		relationName: "approval_authority_matrixInPortal_level_1_role_roleInPortal_role_code"
	}),
	roleInPortal_level_2_role: one(roleInPortal, {
		fields: [approval_authority_matrixInPortal.level_2_role],
		references: [roleInPortal.role_code],
		relationName: "approval_authority_matrixInPortal_level_2_role_roleInPortal_role_code"
	}),
	roleInPortal_level_3_role: one(roleInPortal, {
		fields: [approval_authority_matrixInPortal.level_3_role],
		references: [roleInPortal.role_code],
		relationName: "approval_authority_matrixInPortal_level_3_role_roleInPortal_role_code"
	}),
}));

export const roleInPortalRelations = relations(roleInPortal, ({many}) => ({
	approval_authority_matrixInPortals_level_1_role: many(approval_authority_matrixInPortal, {
		relationName: "approval_authority_matrixInPortal_level_1_role_roleInPortal_role_code"
	}),
	approval_authority_matrixInPortals_level_2_role: many(approval_authority_matrixInPortal, {
		relationName: "approval_authority_matrixInPortal_level_2_role_roleInPortal_role_code"
	}),
	approval_authority_matrixInPortals_level_3_role: many(approval_authority_matrixInPortal, {
		relationName: "approval_authority_matrixInPortal_level_3_role_roleInPortal_role_code"
	}),
	approval_logInPortals: many(approval_logInPortal),
	approval_stepInShareds: many(approval_stepInShared),
	approval_ruleInShareds: many(approval_ruleInShared),
	staff_space_assignmentInHostels: many(staff_space_assignmentInHostel),
	report_visibilityInShareds: many(report_visibilityInShared),
	amc_renewal_decisionInPortals: many(amc_renewal_decisionInPortal),
	user_roleInPortals: many(user_roleInPortal),
	indent_eventInPortals: many(indent_eventInPortal),
	new_request_eventInPortals: many(new_request_eventInPortal),
	po_eventInPortals: many(po_eventInPortal),
}));

export const stock_movementInPortalRelations = relations(stock_movementInPortal, ({one}) => ({
	stock_adjustmentInPortal: one(stock_adjustmentInPortal, {
		fields: [stock_movementInPortal.adjustment_id],
		references: [stock_adjustmentInPortal.adjustment_id]
	}),
	physical_countInPortal: one(physical_countInPortal, {
		fields: [stock_movementInPortal.count_id],
		references: [physical_countInPortal.count_id]
	}),
	deploymentInPortal: one(deploymentInPortal, {
		fields: [stock_movementInPortal.deployment_id],
		references: [deploymentInPortal.deployment_id]
	}),
	stock_entryInPortal: one(stock_entryInPortal, {
		fields: [stock_movementInPortal.stock_entry_id],
		references: [stock_entryInPortal.entry_id]
	}),
	grnInPortal: one(grnInPortal, {
		fields: [stock_movementInPortal.grn_id],
		references: [grnInPortal.grn_id]
	}),
	material_issueInPortal: one(material_issueInPortal, {
		fields: [stock_movementInPortal.issue_id],
		references: [material_issueInPortal.issue_id]
	}),
	receiptInPortal: one(receiptInPortal, {
		fields: [stock_movementInPortal.receipt_id],
		references: [receiptInPortal.receipt_id]
	}),
	stock_returnInPortal: one(stock_returnInPortal, {
		fields: [stock_movementInPortal.return_id],
		references: [stock_returnInPortal.return_id]
	}),
	return_to_vendorInPortal: one(return_to_vendorInPortal, {
		fields: [stock_movementInPortal.rtv_id],
		references: [return_to_vendorInPortal.rtv_id]
	}),
	scrap_returnInPortal: one(scrap_returnInPortal, {
		fields: [stock_movementInPortal.srn_id],
		references: [scrap_returnInPortal.srn_id]
	}),
	stock_transferInPortal: one(stock_transferInPortal, {
		fields: [stock_movementInPortal.transfer_id],
		references: [stock_transferInPortal.transfer_id]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [stock_movementInPortal.actor_id],
		references: [app_userInPortal.user_id]
	}),
	batchInPortal: one(batchInPortal, {
		fields: [stock_movementInPortal.batch_id],
		references: [batchInPortal.batch_id]
	}),
	binInPortal: one(binInPortal, {
		fields: [stock_movementInPortal.bin_code],
		references: [binInPortal.bin_code]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [stock_movementInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const stock_adjustmentInPortalRelations = relations(stock_adjustmentInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	staff_masterInRef_approved_by: one(staff_masterInRef, {
		fields: [stock_adjustmentInPortal.approved_by],
		references: [staff_masterInRef.staff_id],
		relationName: "stock_adjustmentInPortal_approved_by_staff_masterInRef_staff_id"
	}),
	binInPortal: one(binInPortal, {
		fields: [stock_adjustmentInPortal.bin_code],
		references: [binInPortal.bin_code]
	}),
	locationInPortal: one(locationInPortal, {
		fields: [stock_adjustmentInPortal.location_code],
		references: [locationInPortal.location_code]
	}),
	staff_masterInRef_requested_by: one(staff_masterInRef, {
		fields: [stock_adjustmentInPortal.requested_by],
		references: [staff_masterInRef.staff_id],
		relationName: "stock_adjustmentInPortal_requested_by_staff_masterInRef_staff_id"
	}),
	materialInPortal: one(materialInPortal, {
		fields: [stock_adjustmentInPortal.sku],
		references: [materialInPortal.sku]
	}),
	physical_count_lineInPortals: many(physical_count_lineInPortal),
}));

export const physical_countInPortalRelations = relations(physical_countInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	staff_masterInRef_counted_by: one(staff_masterInRef, {
		fields: [physical_countInPortal.counted_by],
		references: [staff_masterInRef.staff_id],
		relationName: "physical_countInPortal_counted_by_staff_masterInRef_staff_id"
	}),
	locationInPortal: one(locationInPortal, {
		fields: [physical_countInPortal.location_code],
		references: [locationInPortal.location_code]
	}),
	staff_masterInRef_verified_by: one(staff_masterInRef, {
		fields: [physical_countInPortal.verified_by],
		references: [staff_masterInRef.staff_id],
		relationName: "physical_countInPortal_verified_by_staff_masterInRef_staff_id"
	}),
	physical_count_lineInPortals: many(physical_count_lineInPortal),
}));

export const deploymentInPortalRelations = relations(deploymentInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [deploymentInPortal.custodian_staff_id],
		references: [staff_masterInRef.staff_id]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [deploymentInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	facilityInInfra: one(facilityInInfra, {
		fields: [deploymentInPortal.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	binInPortal: one(binInPortal, {
		fields: [deploymentInPortal.from_bin],
		references: [binInPortal.bin_code]
	}),
	grnInPortal: one(grnInPortal, {
		fields: [deploymentInPortal.grn_id],
		references: [grnInPortal.grn_id]
	}),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [deploymentInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [deploymentInPortal.sku],
		references: [materialInPortal.sku]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [deploymentInPortal.space_id],
		references: [spaceInInfra.space_id]
	}),
	subspaceInInfra: one(subspaceInInfra, {
		fields: [deploymentInPortal.subspace_id],
		references: [subspaceInInfra.subspace_id]
	}),
	technicianInInfra: one(technicianInInfra, {
		fields: [deploymentInPortal.technician_id],
		references: [technicianInInfra.technician_id]
	}),
	maintenance_ticketInInfra: one(maintenance_ticketInInfra, {
		fields: [deploymentInPortal.ticket_id],
		references: [maintenance_ticketInInfra.ticket_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [deploymentInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	commissioning_handoverInPortals: many(commissioning_handoverInPortal),
	assetInPortals: many(assetInPortal),
	asset_capitalisationInPortals: many(asset_capitalisationInPortal),
	deployment_eventInPortals: many(deployment_eventInPortal),
}));

export const stock_entryInPortalRelations = relations(stock_entryInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [stock_entryInPortal.matched_po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [stock_entryInPortal.actor_id],
		references: [app_userInPortal.user_id]
	}),
	binInPortal: one(binInPortal, {
		fields: [stock_entryInPortal.bin_code],
		references: [binInPortal.bin_code]
	}),
	indentInPortal: one(indentInPortal, {
		fields: [stock_entryInPortal.matched_indent_id],
		references: [indentInPortal.indent_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [stock_entryInPortal.sku],
		references: [materialInPortal.sku]
	}),
	stock_entry_findingInPortals: many(stock_entry_findingInPortal),
}));

export const material_issueInPortalRelations = relations(material_issueInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	hostel_allocationInHostel: one(hostel_allocationInHostel, {
		fields: [material_issueInPortal.hostel_alloc_id],
		references: [hostel_allocationInHostel.hostel_alloc_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [material_issueInPortal.acknowledged_by],
		references: [staff_masterInRef.staff_id]
	}),
	app_userInPortal_collected_by: one(app_userInPortal, {
		fields: [material_issueInPortal.collected_by],
		references: [app_userInPortal.user_id],
		relationName: "material_issueInPortal_collected_by_app_userInPortal_user_id"
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [material_issueInPortal.delivered_to_space_id],
		references: [spaceInInfra.space_id]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [material_issueInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	indentInPortal: one(indentInPortal, {
		fields: [material_issueInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	app_userInPortal_issued_by: one(app_userInPortal, {
		fields: [material_issueInPortal.issued_by],
		references: [app_userInPortal.user_id],
		relationName: "material_issueInPortal_issued_by_app_userInPortal_user_id"
	}),
	locationInPortal: one(locationInPortal, {
		fields: [material_issueInPortal.location_code],
		references: [locationInPortal.location_code]
	}),
	maintenance_ticketInInfra: one(maintenance_ticketInInfra, {
		fields: [material_issueInPortal.ticket_id],
		references: [maintenance_ticketInInfra.ticket_id]
	}),
	dept_consumptionInPortals: many(dept_consumptionInPortal),
	stock_returnInPortals: many(stock_returnInPortal),
	material_issue_lineInPortals: many(material_issue_lineInPortal),
}));

export const receiptInPortalRelations = relations(receiptInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	binInPortal: one(binInPortal, {
		fields: [receiptInPortal.bin_code],
		references: [binInPortal.bin_code]
	}),
	app_userInPortal_owner_id: one(app_userInPortal, {
		fields: [receiptInPortal.owner_id],
		references: [app_userInPortal.user_id],
		relationName: "receiptInPortal_owner_id_app_userInPortal_user_id"
	}),
	materialInPortal: one(materialInPortal, {
		fields: [receiptInPortal.sku],
		references: [materialInPortal.sku]
	}),
	app_userInPortal_verified_by: one(app_userInPortal, {
		fields: [receiptInPortal.verified_by],
		references: [app_userInPortal.user_id],
		relationName: "receiptInPortal_verified_by_app_userInPortal_user_id"
	}),
	assetInPortals: many(assetInPortal),
}));

export const stock_returnInPortalRelations = relations(stock_returnInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	departmentInRef: one(departmentInRef, {
		fields: [stock_returnInPortal.from_dept],
		references: [departmentInRef.dept_code]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [stock_returnInPortal.from_space_id],
		references: [spaceInInfra.space_id]
	}),
	material_issueInPortal: one(material_issueInPortal, {
		fields: [stock_returnInPortal.issue_id],
		references: [material_issueInPortal.issue_id]
	}),
	staff_masterInRef_received_by: one(staff_masterInRef, {
		fields: [stock_returnInPortal.received_by],
		references: [staff_masterInRef.staff_id],
		relationName: "stock_returnInPortal_received_by_staff_masterInRef_staff_id"
	}),
	staff_masterInRef_returned_by: one(staff_masterInRef, {
		fields: [stock_returnInPortal.returned_by],
		references: [staff_masterInRef.staff_id],
		relationName: "stock_returnInPortal_returned_by_staff_masterInRef_staff_id"
	}),
	locationInPortal: one(locationInPortal, {
		fields: [stock_returnInPortal.to_location],
		references: [locationInPortal.location_code]
	}),
}));

export const return_to_vendorInPortalRelations = relations(return_to_vendorInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	debit_noteInPortal: one(debit_noteInPortal, {
		fields: [return_to_vendorInPortal.debit_note_id],
		references: [debit_noteInPortal.note_id],
		relationName: "return_to_vendorInPortal_debit_note_id_debit_noteInPortal_note_id"
	}),
	grnInPortal_grn_id: one(grnInPortal, {
		fields: [return_to_vendorInPortal.grn_id],
		references: [grnInPortal.grn_id],
		relationName: "return_to_vendorInPortal_grn_id_grnInPortal_grn_id"
	}),
	grnInPortal_replacement_grn_id: one(grnInPortal, {
		fields: [return_to_vendorInPortal.replacement_grn_id],
		references: [grnInPortal.grn_id],
		relationName: "return_to_vendorInPortal_replacement_grn_id_grnInPortal_grn_id"
	}),
	materialInPortal: one(materialInPortal, {
		fields: [return_to_vendorInPortal.sku],
		references: [materialInPortal.sku]
	}),
	transporterInPortal: one(transporterInPortal, {
		fields: [return_to_vendorInPortal.transporter_id],
		references: [transporterInPortal.transporter_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [return_to_vendorInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	debit_noteInPortals: many(debit_noteInPortal, {
		relationName: "debit_noteInPortal_rtv_id_return_to_vendorInPortal_rtv_id"
	}),
}));

export const scrap_returnInPortalRelations = relations(scrap_returnInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [scrap_returnInPortal.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	indentInPortal: one(indentInPortal, {
		fields: [scrap_returnInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [scrap_returnInPortal.received_by],
		references: [app_userInPortal.user_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [scrap_returnInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const stock_transferInPortalRelations = relations(stock_transferInPortal, ({one, many}) => ({
	stock_movementInPortals: many(stock_movementInPortal),
	staff_masterInRef_approved_by: one(staff_masterInRef, {
		fields: [stock_transferInPortal.approved_by],
		references: [staff_masterInRef.staff_id],
		relationName: "stock_transferInPortal_approved_by_staff_masterInRef_staff_id"
	}),
	locationInPortal_from_location: one(locationInPortal, {
		fields: [stock_transferInPortal.from_location],
		references: [locationInPortal.location_code],
		relationName: "stock_transferInPortal_from_location_locationInPortal_location_code"
	}),
	indentInPortal: one(indentInPortal, {
		fields: [stock_transferInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	staff_masterInRef_requested_by: one(staff_masterInRef, {
		fields: [stock_transferInPortal.requested_by],
		references: [staff_masterInRef.staff_id],
		relationName: "stock_transferInPortal_requested_by_staff_masterInRef_staff_id"
	}),
	locationInPortal_to_location: one(locationInPortal, {
		fields: [stock_transferInPortal.to_location],
		references: [locationInPortal.location_code],
		relationName: "stock_transferInPortal_to_location_locationInPortal_location_code"
	}),
	stock_transfer_lineInPortals: many(stock_transfer_lineInPortal),
}));

export const indentInPortalRelations = relations(indentInPortal, ({one, many}) => ({
	budget_headInPortal: one(budget_headInPortal, {
		fields: [indentInPortal.budget_code],
		references: [budget_headInPortal.budget_code]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [indentInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	facilityInInfra: one(facilityInInfra, {
		fields: [indentInPortal.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [indentInPortal.hod_approval_by],
		references: [staff_masterInRef.staff_id]
	}),
	locationInPortal: one(locationInPortal, {
		fields: [indentInPortal.preferred_location],
		references: [locationInPortal.location_code]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [indentInPortal.raised_by],
		references: [app_userInPortal.user_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [indentInPortal.target_space_id],
		references: [spaceInInfra.space_id]
	}),
	maintenance_ticketInInfra: one(maintenance_ticketInInfra, {
		fields: [indentInPortal.ticket_id],
		references: [maintenance_ticketInInfra.ticket_id]
	}),
	work_orderInInfra: one(work_orderInInfra, {
		fields: [indentInPortal.work_order_id],
		references: [work_orderInInfra.work_order_id]
	}),
	indent_stepInPortal: one(indent_stepInPortal, {
		fields: [indentInPortal.workflow_step],
		references: [indent_stepInPortal.step]
	}),
	stock_transferInPortals: many(stock_transferInPortal),
	stock_checkInPortals: many(stock_checkInPortal),
	scrap_returnInPortals: many(scrap_returnInPortal),
	material_issueInPortals: many(material_issueInPortal),
	stock_entryInPortals: many(stock_entryInPortal),
	new_requestInPortals: many(new_requestInPortal),
	purchase_requisitionInPortals: many(purchase_requisitionInPortal),
	rfqInPortals: many(rfqInPortal),
	purchase_orderInPortals: many(purchase_orderInPortal),
	stock_reservationInPortals: many(stock_reservationInPortal),
	indent_eventInPortals: many(indent_eventInPortal),
	indent_lineInPortals: many(indent_lineInPortal),
}));

export const indent_stepInPortalRelations = relations(indent_stepInPortal, ({many}) => ({
	indentInPortals: many(indentInPortal),
}));

export const stock_checkInPortalRelations = relations(stock_checkInPortal, ({one, many}) => ({
	app_userInPortal: one(app_userInPortal, {
		fields: [stock_checkInPortal.checked_by],
		references: [app_userInPortal.user_id]
	}),
	indentInPortal: one(indentInPortal, {
		fields: [stock_checkInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	stock_check_lineInPortals: many(stock_check_lineInPortal),
}));

export const hostel_allocationInHostelRelations = relations(hostel_allocationInHostel, ({one, many}) => ({
	material_issueInPortals: many(material_issueInPortal),
	vacate_requestInHostels: many(vacate_requestInHostel),
	academic_yearInHostel: one(academic_yearInHostel, {
		fields: [hostel_allocationInHostel.academic_year],
		references: [academic_yearInHostel.academic_year]
	}),
	staff_masterInRef_approved_by: one(staff_masterInRef, {
		fields: [hostel_allocationInHostel.approved_by],
		references: [staff_masterInRef.staff_id],
		relationName: "hostel_allocationInHostel_approved_by_staff_masterInRef_staff_id"
	}),
	staff_masterInRef_checked_in_by: one(staff_masterInRef, {
		fields: [hostel_allocationInHostel.checked_in_by],
		references: [staff_masterInRef.staff_id],
		relationName: "hostel_allocationInHostel_checked_in_by_staff_masterInRef_staff_id"
	}),
	room_offerInHostel: one(room_offerInHostel, {
		fields: [hostel_allocationInHostel.offer_id],
		references: [room_offerInHostel.offer_id]
	}),
	staff_masterInRef_staff_id: one(staff_masterInRef, {
		fields: [hostel_allocationInHostel.staff_id],
		references: [staff_masterInRef.staff_id],
		relationName: "hostel_allocationInHostel_staff_id_staff_masterInRef_staff_id"
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [hostel_allocationInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	subspaceInInfra: one(subspaceInInfra, {
		fields: [hostel_allocationInHostel.subspace_id],
		references: [subspaceInInfra.subspace_id]
	}),
	room_handoverInHostels: many(room_handoverInHostel),
	meter_student_mapInHostels: many(meter_student_mapInHostel),
}));

export const dept_consumptionInPortalRelations = relations(dept_consumptionInPortal, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [dept_consumptionInPortal.custodian_id],
		references: [staff_masterInRef.staff_id]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [dept_consumptionInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	material_issueInPortal: one(material_issueInPortal, {
		fields: [dept_consumptionInPortal.issue_id],
		references: [material_issueInPortal.issue_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [dept_consumptionInPortal.sku],
		references: [materialInPortal.sku]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [dept_consumptionInPortal.space_id],
		references: [spaceInInfra.space_id]
	}),
}));

export const purchase_orderInPortalRelations = relations(purchase_orderInPortal, ({one, many}) => ({
	stock_entryInPortals: many(stock_entryInPortal),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [purchase_orderInPortal.approved_by],
		references: [staff_masterInRef.staff_id]
	}),
	budget_headInPortal: one(budget_headInPortal, {
		fields: [purchase_orderInPortal.budget_code],
		references: [budget_headInPortal.budget_code]
	}),
	app_userInPortal_deleted_by: one(app_userInPortal, {
		fields: [purchase_orderInPortal.deleted_by],
		references: [app_userInPortal.user_id],
		relationName: "purchase_orderInPortal_deleted_by_app_userInPortal_user_id"
	}),
	locationInPortal: one(locationInPortal, {
		fields: [purchase_orderInPortal.delivery_location],
		references: [locationInPortal.location_code]
	}),
	facilityInInfra: one(facilityInInfra, {
		fields: [purchase_orderInPortal.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	po_counterInPortal: one(po_counterInPortal, {
		fields: [purchase_orderInPortal.fy],
		references: [po_counterInPortal.fy]
	}),
	indentInPortal: one(indentInPortal, {
		fields: [purchase_orderInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	purchase_requisitionInPortal: one(purchase_requisitionInPortal, {
		fields: [purchase_orderInPortal.pr_id],
		references: [purchase_requisitionInPortal.pr_id]
	}),
	app_userInPortal_prepared_by: one(app_userInPortal, {
		fields: [purchase_orderInPortal.prepared_by],
		references: [app_userInPortal.user_id],
		relationName: "purchase_orderInPortal_prepared_by_app_userInPortal_user_id"
	}),
	new_requestInPortal: one(new_requestInPortal, {
		fields: [purchase_orderInPortal.request_id],
		references: [new_requestInPortal.request_id]
	}),
	rfqInPortal: one(rfqInPortal, {
		fields: [purchase_orderInPortal.rfq_id],
		references: [rfqInPortal.rfq_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [purchase_orderInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	po_termsInPortals: many(po_termsInPortal),
	po_amendmentInPortals: many(po_amendmentInPortal),
	po_conditionInPortals: many(po_conditionInPortal),
	po_alertInPortals: many(po_alertInPortal),
	shipmentInPortals: many(shipmentInPortal),
	deploymentInPortals: many(deploymentInPortal),
	asset_capitalisationInPortals: many(asset_capitalisationInPortal),
	vendor_invoiceInPortals: many(vendor_invoiceInPortal),
	po_paymentInPortals: many(po_paymentInPortal),
	advance_paymentInPortals: many(advance_paymentInPortal),
	vendor_performanceInPortals: many(vendor_performanceInPortal),
	po_eventInPortals: many(po_eventInPortal),
	po_lineInPortals: many(po_lineInPortal),
}));

export const stock_transfer_lineInPortalRelations = relations(stock_transfer_lineInPortal, ({one}) => ({
	batchInPortal: one(batchInPortal, {
		fields: [stock_transfer_lineInPortal.batch_id],
		references: [batchInPortal.batch_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [stock_transfer_lineInPortal.sku],
		references: [materialInPortal.sku]
	}),
	stock_transferInPortal: one(stock_transferInPortal, {
		fields: [stock_transfer_lineInPortal.transfer_id],
		references: [stock_transferInPortal.transfer_id]
	}),
}));

export const physical_count_lineInPortalRelations = relations(physical_count_lineInPortal, ({one}) => ({
	stock_adjustmentInPortal: one(stock_adjustmentInPortal, {
		fields: [physical_count_lineInPortal.adjustment_id],
		references: [stock_adjustmentInPortal.adjustment_id]
	}),
	binInPortal: one(binInPortal, {
		fields: [physical_count_lineInPortal.bin_code],
		references: [binInPortal.bin_code]
	}),
	physical_countInPortal: one(physical_countInPortal, {
		fields: [physical_count_lineInPortal.count_id],
		references: [physical_countInPortal.count_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [physical_count_lineInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const new_requestInPortalRelations = relations(new_requestInPortal, ({one, many}) => ({
	categoryInPortal: one(categoryInPortal, {
		fields: [new_requestInPortal.category_code],
		references: [categoryInPortal.category_code]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [new_requestInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	indentInPortal: one(indentInPortal, {
		fields: [new_requestInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [new_requestInPortal.raised_by],
		references: [app_userInPortal.user_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [new_requestInPortal.registered_sku],
		references: [materialInPortal.sku]
	}),
	unit_of_measureInPortal: one(unit_of_measureInPortal, {
		fields: [new_requestInPortal.uom],
		references: [unit_of_measureInPortal.uom]
	}),
	purchase_orderInPortals: many(purchase_orderInPortal),
	new_request_eventInPortals: many(new_request_eventInPortal),
}));

export const pr_lineInPortalRelations = relations(pr_lineInPortal, ({one, many}) => ({
	po_lineInPortal: one(po_lineInPortal, {
		fields: [pr_lineInPortal.po_line_id],
		references: [po_lineInPortal.po_line_id]
	}),
	locationInPortal: one(locationInPortal, {
		fields: [pr_lineInPortal.delivery_location],
		references: [locationInPortal.location_code]
	}),
	indent_lineInPortal: one(indent_lineInPortal, {
		fields: [pr_lineInPortal.indent_id],
		references: [indent_lineInPortal.indent_id],
		relationName: "pr_lineInPortal_indent_id_indent_lineInPortal_indent_id"
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [pr_lineInPortal.install_space_id],
		references: [spaceInInfra.space_id]
	}),
	purchase_requisitionInPortal: one(purchase_requisitionInPortal, {
		fields: [pr_lineInPortal.pr_id],
		references: [purchase_requisitionInPortal.pr_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [pr_lineInPortal.sku],
		references: [materialInPortal.sku]
	}),
	unit_of_measureInPortal: one(unit_of_measureInPortal, {
		fields: [pr_lineInPortal.uom],
		references: [unit_of_measureInPortal.uom]
	}),
	indent_lineInPortals: many(indent_lineInPortal, {
		relationName: "indent_lineInPortal_pr_line_id_pr_lineInPortal_pr_line_id"
	}),
}));

export const po_lineInPortalRelations = relations(po_lineInPortal, ({one, many}) => ({
	pr_lineInPortals: many(pr_lineInPortal),
	grnInPortals: many(grnInPortal),
	vendor_invoice_lineInPortals: many(vendor_invoice_lineInPortal),
	spaceInInfra: one(spaceInInfra, {
		fields: [po_lineInPortal.install_space_id],
		references: [spaceInInfra.space_id]
	}),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [po_lineInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [po_lineInPortal.sku],
		references: [materialInPortal.sku]
	}),
	unit_of_measureInPortal: one(unit_of_measureInPortal, {
		fields: [po_lineInPortal.uom],
		references: [unit_of_measureInPortal.uom]
	}),
}));

export const indent_lineInPortalRelations = relations(indent_lineInPortal, ({one, many}) => ({
	pr_lineInPortals: many(pr_lineInPortal, {
		relationName: "pr_lineInPortal_indent_id_indent_lineInPortal_indent_id"
	}),
	pr_lineInPortal: one(pr_lineInPortal, {
		fields: [indent_lineInPortal.pr_line_id],
		references: [pr_lineInPortal.pr_line_id],
		relationName: "indent_lineInPortal_pr_line_id_pr_lineInPortal_pr_line_id"
	}),
	indentInPortal: one(indentInPortal, {
		fields: [indent_lineInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [indent_lineInPortal.sku],
		references: [materialInPortal.sku]
	}),
	unit_of_measureInPortal: one(unit_of_measureInPortal, {
		fields: [indent_lineInPortal.uom],
		references: [unit_of_measureInPortal.uom]
	}),
}));

export const purchase_requisitionInPortalRelations = relations(purchase_requisitionInPortal, ({one, many}) => ({
	pr_lineInPortals: many(pr_lineInPortal),
	budget_headInPortal: one(budget_headInPortal, {
		fields: [purchase_requisitionInPortal.budget_code],
		references: [budget_headInPortal.budget_code]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [purchase_requisitionInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	staff_masterInRef_finance_approval: one(staff_masterInRef, {
		fields: [purchase_requisitionInPortal.finance_approval],
		references: [staff_masterInRef.staff_id],
		relationName: "purchase_requisitionInPortal_finance_approval_staff_masterInRef_staff_id"
	}),
	indentInPortal: one(indentInPortal, {
		fields: [purchase_requisitionInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	staff_masterInRef_principal_approval: one(staff_masterInRef, {
		fields: [purchase_requisitionInPortal.principal_approval],
		references: [staff_masterInRef.staff_id],
		relationName: "purchase_requisitionInPortal_principal_approval_staff_masterInRef_staff_id"
	}),
	locationInPortal: one(locationInPortal, {
		fields: [purchase_requisitionInPortal.raised_by_location],
		references: [locationInPortal.location_code]
	}),
	staff_masterInRef_stores_head_approval: one(staff_masterInRef, {
		fields: [purchase_requisitionInPortal.stores_head_approval],
		references: [staff_masterInRef.staff_id],
		relationName: "purchase_requisitionInPortal_stores_head_approval_staff_masterInRef_staff_id"
	}),
	rfqInPortals: many(rfqInPortal),
	purchase_orderInPortals: many(purchase_orderInPortal),
}));

export const rfqInPortalRelations = relations(rfqInPortal, ({one, many}) => ({
	indentInPortal: one(indentInPortal, {
		fields: [rfqInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [rfqInPortal.issued_by],
		references: [app_userInPortal.user_id]
	}),
	purchase_requisitionInPortal: one(purchase_requisitionInPortal, {
		fields: [rfqInPortal.pr_id],
		references: [purchase_requisitionInPortal.pr_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [rfqInPortal.sku],
		references: [materialInPortal.sku]
	}),
	purchase_orderInPortals: many(purchase_orderInPortal),
	rfq_vendorInPortals: many(rfq_vendorInPortal),
	rfq_bidInPortals: many(rfq_bidInPortal),
}));

export const vendor_evaluationInPortalRelations = relations(vendor_evaluationInPortal, ({one}) => ({
	vendor_evaluation_criteriaInPortal: one(vendor_evaluation_criteriaInPortal, {
		fields: [vendor_evaluationInPortal.criteria_set_id],
		references: [vendor_evaluation_criteriaInPortal.criteria_set_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [vendor_evaluationInPortal.evaluated_by],
		references: [staff_masterInRef.staff_id]
	}),
	rfq_bidInPortal: one(rfq_bidInPortal, {
		fields: [vendor_evaluationInPortal.rfq_id],
		references: [rfq_bidInPortal.rfq_id]
	}),
}));

export const vendor_evaluation_criteriaInPortalRelations = relations(vendor_evaluation_criteriaInPortal, ({many}) => ({
	vendor_evaluationInPortals: many(vendor_evaluationInPortal),
}));

export const rfq_bidInPortalRelations = relations(rfq_bidInPortal, ({one, many}) => ({
	vendor_evaluationInPortals: many(vendor_evaluationInPortal),
	vendor_rankingInPortals: many(vendor_rankingInPortal),
	documentInShared: one(documentInShared, {
		fields: [rfq_bidInPortal.attachment_doc_id],
		references: [documentInShared.doc_id]
	}),
	rfqInPortal: one(rfqInPortal, {
		fields: [rfq_bidInPortal.rfq_id],
		references: [rfqInPortal.rfq_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [rfq_bidInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
}));

export const vendor_rankingInPortalRelations = relations(vendor_rankingInPortal, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [vendor_rankingInPortal.committee_approval_by],
		references: [staff_masterInRef.staff_id]
	}),
	rfq_bidInPortal: one(rfq_bidInPortal, {
		fields: [vendor_rankingInPortal.rfq_id],
		references: [rfq_bidInPortal.rfq_id]
	}),
}));

export const po_counterInPortalRelations = relations(po_counterInPortal, ({many}) => ({
	purchase_orderInPortals: many(purchase_orderInPortal),
}));

export const po_termsInPortalRelations = relations(po_termsInPortal, ({one}) => ({
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [po_termsInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
}));

export const po_amendmentInPortalRelations = relations(po_amendmentInPortal, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [po_amendmentInPortal.approved_by],
		references: [staff_masterInRef.staff_id]
	}),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [po_amendmentInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
}));

export const po_conditionInPortalRelations = relations(po_conditionInPortal, ({one, many}) => ({
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [po_conditionInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [po_conditionInPortal.watched_by],
		references: [staff_masterInRef.staff_id]
	}),
	po_alertInPortals: many(po_alertInPortal),
}));

export const po_alertInPortalRelations = relations(po_alertInPortal, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [po_alertInPortal.assigned_to],
		references: [staff_masterInRef.staff_id]
	}),
	po_conditionInPortal: one(po_conditionInPortal, {
		fields: [po_alertInPortal.condition_id],
		references: [po_conditionInPortal.condition_id]
	}),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [po_alertInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
}));

export const approval_logInPortalRelations = relations(approval_logInPortal, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [approval_logInPortal.approver_id],
		references: [staff_masterInRef.staff_id]
	}),
	roleInPortal: one(roleInPortal, {
		fields: [approval_logInPortal.approver_role],
		references: [roleInPortal.role_code]
	}),
}));

export const shipmentInPortalRelations = relations(shipmentInPortal, ({one, many}) => ({
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [shipmentInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	transporterInPortal: one(transporterInPortal, {
		fields: [shipmentInPortal.transporter_id],
		references: [transporterInPortal.transporter_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [shipmentInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	shipment_trackingInPortals: many(shipment_trackingInPortal),
	gate_entryInPortals: many(gate_entryInPortal),
	grnInPortals: many(grnInPortal),
}));

export const shipment_trackingInPortalRelations = relations(shipment_trackingInPortal, ({one}) => ({
	shipmentInPortal: one(shipmentInPortal, {
		fields: [shipment_trackingInPortal.shipment_id],
		references: [shipmentInPortal.shipment_id]
	}),
}));

export const gate_entryInPortalRelations = relations(gate_entryInPortal, ({one, many}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [gate_entryInPortal.security_staff_id],
		references: [staff_masterInRef.staff_id]
	}),
	shipmentInPortal: one(shipmentInPortal, {
		fields: [gate_entryInPortal.shipment_id],
		references: [shipmentInPortal.shipment_id]
	}),
	grnInPortals: many(grnInPortal),
}));

export const quality_inspectionInPortalRelations = relations(quality_inspectionInPortal, ({one, many}) => ({
	documentInShared: one(documentInShared, {
		fields: [quality_inspectionInPortal.report_doc_id],
		references: [documentInShared.doc_id]
	}),
	grnInPortal: one(grnInPortal, {
		fields: [quality_inspectionInPortal.grn_id],
		references: [grnInPortal.grn_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [quality_inspectionInPortal.inspected_by],
		references: [staff_masterInRef.staff_id]
	}),
	quality_inspection_lineInPortals: many(quality_inspection_lineInPortal),
}));

export const documentInSharedRelations = relations(documentInShared, ({one, many}) => ({
	quality_inspectionInPortals: many(quality_inspectionInPortal),
	commissioning_handoverInPortals: many(commissioning_handoverInPortal),
	vendor_invoiceInPortals: many(vendor_invoiceInPortal),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [documentInShared.uploaded_by],
		references: [staff_masterInRef.staff_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [documentInShared.uploaded_by_student],
		references: [student_masterInRef.student_id]
	}),
	vacate_requestInHostels: many(vacate_requestInHostel),
	sick_leaveInHostels: many(sick_leaveInHostel),
	rfq_bidInPortals: many(rfq_bidInPortal),
}));

export const quality_inspection_lineInPortalRelations = relations(quality_inspection_lineInPortal, ({one}) => ({
	quality_inspectionInPortal: one(quality_inspectionInPortal, {
		fields: [quality_inspection_lineInPortal.inspection_id],
		references: [quality_inspectionInPortal.inspection_id]
	}),
}));

export const debit_noteInPortalRelations = relations(debit_noteInPortal, ({one, many}) => ({
	return_to_vendorInPortals: many(return_to_vendorInPortal, {
		relationName: "return_to_vendorInPortal_debit_note_id_debit_noteInPortal_note_id"
	}),
	vendor_invoiceInPortal: one(vendor_invoiceInPortal, {
		fields: [debit_noteInPortal.invoice_id],
		references: [vendor_invoiceInPortal.invoice_id]
	}),
	return_to_vendorInPortal: one(return_to_vendorInPortal, {
		fields: [debit_noteInPortal.rtv_id],
		references: [return_to_vendorInPortal.rtv_id],
		relationName: "debit_noteInPortal_rtv_id_return_to_vendorInPortal_rtv_id"
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [debit_noteInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
}));

export const commissioning_handoverInPortalRelations = relations(commissioning_handoverInPortal, ({one}) => ({
	amc_contractInInfra: one(amc_contractInInfra, {
		fields: [commissioning_handoverInPortal.amc_id],
		references: [amc_contractInInfra.amc_id]
	}),
	deploymentInPortal: one(deploymentInPortal, {
		fields: [commissioning_handoverInPortal.deployment_id],
		references: [deploymentInPortal.deployment_id]
	}),
	staff_masterInRef_handed_over_to: one(staff_masterInRef, {
		fields: [commissioning_handoverInPortal.handed_over_to],
		references: [staff_masterInRef.staff_id],
		relationName: "commissioning_handoverInPortal_handed_over_to_staff_masterInRef_staff_id"
	}),
	staff_masterInRef_tested_by: one(staff_masterInRef, {
		fields: [commissioning_handoverInPortal.tested_by],
		references: [staff_masterInRef.staff_id],
		relationName: "commissioning_handoverInPortal_tested_by_staff_masterInRef_staff_id"
	}),
	documentInShared: one(documentInShared, {
		fields: [commissioning_handoverInPortal.test_report_doc_id],
		references: [documentInShared.doc_id]
	}),
}));

export const assetInPortalRelations = relations(assetInPortal, ({one, many}) => ({
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [assetInPortal.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	deploymentInPortal: one(deploymentInPortal, {
		fields: [assetInPortal.deployment_id],
		references: [deploymentInPortal.deployment_id]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [assetInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	grnInPortal: one(grnInPortal, {
		fields: [assetInPortal.grn_id],
		references: [grnInPortal.grn_id]
	}),
	receiptInPortal: one(receiptInPortal, {
		fields: [assetInPortal.receipt_id],
		references: [receiptInPortal.receipt_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [assetInPortal.sku],
		references: [materialInPortal.sku]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [assetInPortal.space_id],
		references: [spaceInInfra.space_id]
	}),
	asset_capitalisationInPortals: many(asset_capitalisationInPortal),
	service_ticketInPortals: many(service_ticketInPortal),
}));

export const asset_capitalisationInPortalRelations = relations(asset_capitalisationInPortal, ({one}) => ({
	gl_accountInPortal: one(gl_accountInPortal, {
		fields: [asset_capitalisationInPortal.asset_gl_account_id],
		references: [gl_accountInPortal.gl_account_id]
	}),
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [asset_capitalisationInPortal.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	assetInPortal: one(assetInPortal, {
		fields: [asset_capitalisationInPortal.asset_tag],
		references: [assetInPortal.asset_tag]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [asset_capitalisationInPortal.custodian_id],
		references: [staff_masterInRef.staff_id]
	}),
	deploymentInPortal: one(deploymentInPortal, {
		fields: [asset_capitalisationInPortal.deployment_id],
		references: [deploymentInPortal.deployment_id]
	}),
	grnInPortal: one(grnInPortal, {
		fields: [asset_capitalisationInPortal.grn_id],
		references: [grnInPortal.grn_id]
	}),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [asset_capitalisationInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [asset_capitalisationInPortal.sku],
		references: [materialInPortal.sku]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [asset_capitalisationInPortal.space_id],
		references: [spaceInInfra.space_id]
	}),
}));

export const asset_transferInPortalRelations = relations(asset_transferInPortal, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [asset_transferInPortal.approved_by],
		references: [staff_masterInRef.staff_id]
	}),
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [asset_transferInPortal.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	departmentInRef_from_dept: one(departmentInRef, {
		fields: [asset_transferInPortal.from_dept],
		references: [departmentInRef.dept_code],
		relationName: "asset_transferInPortal_from_dept_departmentInRef_dept_code"
	}),
	spaceInInfra_from_space_id: one(spaceInInfra, {
		fields: [asset_transferInPortal.from_space_id],
		references: [spaceInInfra.space_id],
		relationName: "asset_transferInPortal_from_space_id_spaceInInfra_space_id"
	}),
	departmentInRef_to_dept: one(departmentInRef, {
		fields: [asset_transferInPortal.to_dept],
		references: [departmentInRef.dept_code],
		relationName: "asset_transferInPortal_to_dept_departmentInRef_dept_code"
	}),
	spaceInInfra_to_space_id: one(spaceInInfra, {
		fields: [asset_transferInPortal.to_space_id],
		references: [spaceInInfra.space_id],
		relationName: "asset_transferInPortal_to_space_id_spaceInInfra_space_id"
	}),
}));

export const amc_renewalInPortalRelations = relations(amc_renewalInPortal, ({one, many}) => ({
	amc_contractInInfra: one(amc_contractInInfra, {
		fields: [amc_renewalInPortal.amc_id],
		references: [amc_contractInInfra.amc_id]
	}),
	locationInPortal: one(locationInPortal, {
		fields: [amc_renewalInPortal.location_code],
		references: [locationInPortal.location_code]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [amc_renewalInPortal.requested_by],
		references: [app_userInPortal.user_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [amc_renewalInPortal.sku],
		references: [materialInPortal.sku]
	}),
	amc_renewal_decisionInPortals: many(amc_renewal_decisionInPortal),
}));

export const service_ticketInPortalRelations = relations(service_ticketInPortal, ({one}) => ({
	assetInPortal: one(assetInPortal, {
		fields: [service_ticketInPortal.asset_tag],
		references: [assetInPortal.asset_tag]
	}),
	maintenance_ticketInInfra: one(maintenance_ticketInInfra, {
		fields: [service_ticketInPortal.maintenance_ticket_id],
		references: [maintenance_ticketInInfra.ticket_id]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [service_ticketInPortal.opened_by],
		references: [app_userInPortal.user_id]
	}),
}));

export const budget_txnInPortalRelations = relations(budget_txnInPortal, ({one}) => ({
	budget_headInPortal: one(budget_headInPortal, {
		fields: [budget_txnInPortal.budget_code],
		references: [budget_headInPortal.budget_code]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [budget_txnInPortal.posted_by],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const vendor_invoiceInPortalRelations = relations(vendor_invoiceInPortal, ({one, many}) => ({
	documentInShared: one(documentInShared, {
		fields: [vendor_invoiceInPortal.doc_id],
		references: [documentInShared.doc_id]
	}),
	staff_masterInRef_approved_by: one(staff_masterInRef, {
		fields: [vendor_invoiceInPortal.approved_by],
		references: [staff_masterInRef.staff_id],
		relationName: "vendor_invoiceInPortal_approved_by_staff_masterInRef_staff_id"
	}),
	grnInPortal: one(grnInPortal, {
		fields: [vendor_invoiceInPortal.grn_id],
		references: [grnInPortal.grn_id]
	}),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [vendor_invoiceInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [vendor_invoiceInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	staff_masterInRef_verified_by: one(staff_masterInRef, {
		fields: [vendor_invoiceInPortal.verified_by],
		references: [staff_masterInRef.staff_id],
		relationName: "vendor_invoiceInPortal_verified_by_staff_masterInRef_staff_id"
	}),
	vendor_invoice_lineInPortals: many(vendor_invoice_lineInPortal),
	payment_allocationInPortals: many(payment_allocationInPortal),
	debit_noteInPortals: many(debit_noteInPortal),
}));

export const vendor_invoice_lineInPortalRelations = relations(vendor_invoice_lineInPortal, ({one}) => ({
	budget_headInPortal: one(budget_headInPortal, {
		fields: [vendor_invoice_lineInPortal.budget_code],
		references: [budget_headInPortal.budget_code]
	}),
	gl_accountInPortal: one(gl_accountInPortal, {
		fields: [vendor_invoice_lineInPortal.gl_account_id],
		references: [gl_accountInPortal.gl_account_id]
	}),
	grnInPortal: one(grnInPortal, {
		fields: [vendor_invoice_lineInPortal.grn_id],
		references: [grnInPortal.grn_id]
	}),
	vendor_invoiceInPortal: one(vendor_invoiceInPortal, {
		fields: [vendor_invoice_lineInPortal.invoice_id],
		references: [vendor_invoiceInPortal.invoice_id]
	}),
	po_lineInPortal: one(po_lineInPortal, {
		fields: [vendor_invoice_lineInPortal.po_line_id],
		references: [po_lineInPortal.po_line_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [vendor_invoice_lineInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const po_paymentInPortalRelations = relations(po_paymentInPortal, ({one, many}) => ({
	staff_masterInRef_approved_by: one(staff_masterInRef, {
		fields: [po_paymentInPortal.approved_by],
		references: [staff_masterInRef.staff_id],
		relationName: "po_paymentInPortal_approved_by_staff_masterInRef_staff_id"
	}),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [po_paymentInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	staff_masterInRef_prepared_by: one(staff_masterInRef, {
		fields: [po_paymentInPortal.prepared_by],
		references: [staff_masterInRef.staff_id],
		relationName: "po_paymentInPortal_prepared_by_staff_masterInRef_staff_id"
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [po_paymentInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	advance_paymentInPortals: many(advance_paymentInPortal),
	payment_allocationInPortals: many(payment_allocationInPortal),
}));

export const advance_paymentInPortalRelations = relations(advance_paymentInPortal, ({one, many}) => ({
	po_paymentInPortal: one(po_paymentInPortal, {
		fields: [advance_paymentInPortal.payment_id],
		references: [po_paymentInPortal.payment_id]
	}),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [advance_paymentInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [advance_paymentInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
	payment_allocationInPortals: many(payment_allocationInPortal),
}));

export const payment_allocationInPortalRelations = relations(payment_allocationInPortal, ({one}) => ({
	advance_paymentInPortal: one(advance_paymentInPortal, {
		fields: [payment_allocationInPortal.advance_id],
		references: [advance_paymentInPortal.advance_id]
	}),
	vendor_invoiceInPortal: one(vendor_invoiceInPortal, {
		fields: [payment_allocationInPortal.invoice_id],
		references: [vendor_invoiceInPortal.invoice_id]
	}),
	po_paymentInPortal: one(po_paymentInPortal, {
		fields: [payment_allocationInPortal.payment_id],
		references: [po_paymentInPortal.payment_id]
	}),
}));

export const journal_entryInPortalRelations = relations(journal_entryInPortal, ({one, many}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [journal_entryInPortal.posted_by],
		references: [staff_masterInRef.staff_id]
	}),
	journal_lineInPortals: many(journal_lineInPortal),
}));

export const journal_lineInPortalRelations = relations(journal_lineInPortal, ({one}) => ({
	budget_headInPortal: one(budget_headInPortal, {
		fields: [journal_lineInPortal.budget_code],
		references: [budget_headInPortal.budget_code]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [journal_lineInPortal.dept_code],
		references: [departmentInRef.dept_code]
	}),
	gl_accountInPortal: one(gl_accountInPortal, {
		fields: [journal_lineInPortal.gl_account_id],
		references: [gl_accountInPortal.gl_account_id]
	}),
	journal_entryInPortal: one(journal_entryInPortal, {
		fields: [journal_lineInPortal.journal_id],
		references: [journal_entryInPortal.journal_id]
	}),
}));

export const vendor_performanceInPortalRelations = relations(vendor_performanceInPortal, ({one}) => ({
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [vendor_performanceInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [vendor_performanceInPortal.recorded_by],
		references: [staff_masterInRef.staff_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [vendor_performanceInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
}));

export const approval_stepInSharedRelations = relations(approval_stepInShared, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [approval_stepInShared.acted_by],
		references: [staff_masterInRef.staff_id]
	}),
	roleInPortal: one(roleInPortal, {
		fields: [approval_stepInShared.approver_role],
		references: [roleInPortal.role_code]
	}),
	approval_ruleInShared: one(approval_ruleInShared, {
		fields: [approval_stepInShared.rule_id],
		references: [approval_ruleInShared.rule_id]
	}),
	student_contactInHostel: one(student_contactInHostel, {
		fields: [approval_stepInShared.acted_by_contact],
		references: [student_contactInHostel.contact_id]
	}),
}));

export const approval_ruleInSharedRelations = relations(approval_ruleInShared, ({one, many}) => ({
	approval_stepInShareds: many(approval_stepInShared),
	roleInPortal: one(roleInPortal, {
		fields: [approval_ruleInShared.approver_role],
		references: [roleInPortal.role_code]
	}),
}));

export const student_contactInHostelRelations = relations(student_contactInHostel, ({one, many}) => ({
	approval_stepInShareds: many(approval_stepInShared),
	notificationInShareds: many(notificationInShared),
	student_masterInRef: one(student_masterInRef, {
		fields: [student_contactInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	tracking_consentInHostels: many(tracking_consentInHostel),
}));

export const policy_settingInSharedRelations = relations(policy_settingInShared, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [policy_settingInShared.updated_by],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const notificationInSharedRelations = relations(notificationInShared, ({one}) => ({
	student_contactInHostel: one(student_contactInHostel, {
		fields: [notificationInShared.contact_id],
		references: [student_contactInHostel.contact_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [notificationInShared.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [notificationInShared.student_id],
		references: [student_masterInRef.student_id]
	}),
}));

export const mess_masterInHostelRelations = relations(mess_masterInHostel, ({one, many}) => ({
	facilityInInfra: one(facilityInInfra, {
		fields: [mess_masterInHostel.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [mess_masterInHostel.incharge_id],
		references: [staff_masterInRef.staff_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [mess_masterInHostel.space_id],
		references: [spaceInInfra.space_id]
	}),
	hostel_profileInHostels: many(hostel_profileInHostel),
	mess_subscriptionInHostels: many(mess_subscriptionInHostel),
}));

export const hostel_profileInHostelRelations = relations(hostel_profileInHostel, ({one, many}) => ({
	mess_masterInHostel: one(mess_masterInHostel, {
		fields: [hostel_profileInHostel.default_mess_id],
		references: [mess_masterInHostel.mess_id]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [hostel_profileInHostel.dept_code],
		references: [departmentInRef.dept_code]
	}),
	facilityInInfra: one(facilityInInfra, {
		fields: [hostel_profileInHostel.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	locationInPortal: one(locationInPortal, {
		fields: [hostel_profileInHostel.sub_store_code],
		references: [locationInPortal.location_code]
	}),
	room_type_feeInHostels: many(room_type_feeInHostel),
	hostel_registrationInHostels: many(hostel_registrationInHostel),
	staff_space_assignmentInHostels: many(staff_space_assignmentInHostel),
	hostel_alertInHostels: many(hostel_alertInHostel),
}));

export const room_type_feeInHostelRelations = relations(room_type_feeInHostel, ({one, many}) => ({
	academic_yearInHostel: one(academic_yearInHostel, {
		fields: [room_type_feeInHostel.academic_year],
		references: [academic_yearInHostel.academic_year]
	}),
	hostel_profileInHostel: one(hostel_profileInHostel, {
		fields: [room_type_feeInHostel.facility_id],
		references: [hostel_profileInHostel.facility_id]
	}),
	room_typeInHostel: one(room_typeInHostel, {
		fields: [room_type_feeInHostel.room_type_id],
		references: [room_typeInHostel.room_type_id]
	}),
	fee_planInHostels: many(fee_planInHostel),
}));

export const academic_yearInHostelRelations = relations(academic_yearInHostel, ({many}) => ({
	room_type_feeInHostels: many(room_type_feeInHostel),
	mess_subscriptionInHostels: many(mess_subscriptionInHostel),
	hostel_registrationInHostels: many(hostel_registrationInHostel),
	hostel_allocationInHostels: many(hostel_allocationInHostel),
}));

export const room_typeInHostelRelations = relations(room_typeInHostel, ({many}) => ({
	room_type_feeInHostels: many(room_type_feeInHostel),
	room_profileInHostels: many(room_profileInHostel),
	hostel_registrationInHostels: many(hostel_registrationInHostel),
	electricity_tariffInHostels: many(electricity_tariffInHostel),
	room_standard_inventoryInHostels: many(room_standard_inventoryInHostel),
}));

export const room_profileInHostelRelations = relations(room_profileInHostel, ({one}) => ({
	capture_pointInHostel: one(capture_pointInHostel, {
		fields: [room_profileInHostel.nearest_point_id],
		references: [capture_pointInHostel.point_id]
	}),
	room_typeInHostel: one(room_typeInHostel, {
		fields: [room_profileInHostel.room_type_id],
		references: [room_typeInHostel.room_type_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [room_profileInHostel.space_id],
		references: [spaceInInfra.space_id]
	}),
}));

export const capture_pointInHostelRelations = relations(capture_pointInHostel, ({one, many}) => ({
	room_profileInHostels: many(room_profileInHostel),
	facilityInInfra: one(facilityInInfra, {
		fields: [capture_pointInHostel.facility_id],
		references: [facilityInInfra.facility_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [capture_pointInHostel.space_id],
		references: [spaceInInfra.space_id]
	}),
	zoneInInfra: one(zoneInInfra, {
		fields: [capture_pointInHostel.zone_id],
		references: [zoneInInfra.zone_id]
	}),
	movement_event_defaultInHostels: many(movement_event_defaultInHostel),
}));

export const mess_subscriptionInHostelRelations = relations(mess_subscriptionInHostel, ({one}) => ({
	fee_demandInHostel: one(fee_demandInHostel, {
		fields: [mess_subscriptionInHostel.mess_demand_id],
		references: [fee_demandInHostel.demand_id]
	}),
	academic_yearInHostel: one(academic_yearInHostel, {
		fields: [mess_subscriptionInHostel.academic_year],
		references: [academic_yearInHostel.academic_year]
	}),
	mess_masterInHostel: one(mess_masterInHostel, {
		fields: [mess_subscriptionInHostel.mess_id],
		references: [mess_masterInHostel.mess_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [mess_subscriptionInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
}));

export const fee_demandInHostelRelations = relations(fee_demandInHostel, ({one, many}) => ({
	mess_subscriptionInHostels: many(mess_subscriptionInHostel),
	no_dues_clearanceInHostels: many(no_dues_clearanceInHostel),
	hostel_registrationInHostels: many(hostel_registrationInHostel),
	fee_planInHostel: one(fee_planInHostel, {
		fields: [fee_demandInHostel.fee_plan_id],
		references: [fee_planInHostel.fee_plan_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [fee_demandInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	fee_receiptInHostels: many(fee_receiptInHostel),
}));

export const discipline_caseInHostelRelations = relations(discipline_caseInHostel, ({one, many}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [discipline_caseInHostel.reported_by],
		references: [staff_masterInRef.staff_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [discipline_caseInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	discipline_punishmentInHostels: many(discipline_punishmentInHostel),
}));

export const discipline_punishmentInHostelRelations = relations(discipline_punishmentInHostel, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [discipline_punishmentInHostel.awarded_by],
		references: [staff_masterInRef.staff_id]
	}),
	discipline_caseInHostel: one(discipline_caseInHostel, {
		fields: [discipline_punishmentInHostel.case_id],
		references: [discipline_caseInHostel.case_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [discipline_punishmentInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
}));

export const vacate_requestInHostelRelations = relations(vacate_requestInHostel, ({one, many}) => ({
	hostel_allocationInHostel: one(hostel_allocationInHostel, {
		fields: [vacate_requestInHostel.hostel_alloc_id],
		references: [hostel_allocationInHostel.hostel_alloc_id]
	}),
	documentInShared: one(documentInShared, {
		fields: [vacate_requestInHostel.proof_doc_id],
		references: [documentInShared.doc_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [vacate_requestInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	no_dues_clearanceInHostels: many(no_dues_clearanceInHostel),
	room_handoverInHostels: many(room_handoverInHostel),
}));

export const no_dues_clearanceInHostelRelations = relations(no_dues_clearanceInHostel, ({one}) => ({
	fee_demandInHostel: one(fee_demandInHostel, {
		fields: [no_dues_clearanceInHostel.demand_id],
		references: [fee_demandInHostel.demand_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [no_dues_clearanceInHostel.cleared_by],
		references: [staff_masterInRef.staff_id]
	}),
	vacate_requestInHostel: one(vacate_requestInHostel, {
		fields: [no_dues_clearanceInHostel.vacate_id],
		references: [vacate_requestInHostel.vacate_id]
	}),
}));

export const hostel_registrationInHostelRelations = relations(hostel_registrationInHostel, ({one, many}) => ({
	fee_demandInHostel: one(fee_demandInHostel, {
		fields: [hostel_registrationInHostel.reg_demand_id],
		references: [fee_demandInHostel.demand_id]
	}),
	academic_yearInHostel: one(academic_yearInHostel, {
		fields: [hostel_registrationInHostel.academic_year],
		references: [academic_yearInHostel.academic_year]
	}),
	hostel_profileInHostel: one(hostel_profileInHostel, {
		fields: [hostel_registrationInHostel.facility_id],
		references: [hostel_profileInHostel.facility_id]
	}),
	room_typeInHostel: one(room_typeInHostel, {
		fields: [hostel_registrationInHostel.room_type_id],
		references: [room_typeInHostel.room_type_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [hostel_registrationInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	room_offerInHostels: many(room_offerInHostel),
	fee_planInHostels: many(fee_planInHostel),
}));

export const room_offerInHostelRelations = relations(room_offerInHostel, ({one, many}) => ({
	hostel_allocationInHostels: many(hostel_allocationInHostel),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [room_offerInHostel.offered_by],
		references: [staff_masterInRef.staff_id]
	}),
	hostel_registrationInHostel: one(hostel_registrationInHostel, {
		fields: [room_offerInHostel.registration_id],
		references: [hostel_registrationInHostel.registration_id]
	}),
	subspaceInInfra: one(subspaceInInfra, {
		fields: [room_offerInHostel.subspace_id],
		references: [subspaceInInfra.subspace_id]
	}),
}));

export const room_handoverInHostelRelations = relations(room_handoverInHostel, ({one, many}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [room_handoverInHostel.done_by],
		references: [staff_masterInRef.staff_id]
	}),
	hostel_allocationInHostel: one(hostel_allocationInHostel, {
		fields: [room_handoverInHostel.hostel_alloc_id],
		references: [hostel_allocationInHostel.hostel_alloc_id]
	}),
	vacate_requestInHostel: one(vacate_requestInHostel, {
		fields: [room_handoverInHostel.vacate_id],
		references: [vacate_requestInHostel.vacate_id]
	}),
	meter_readingInHostels: many(meter_readingInHostel),
	room_handover_lineInHostels: many(room_handover_lineInHostel),
}));

export const fee_planInHostelRelations = relations(fee_planInHostel, ({one, many}) => ({
	room_type_feeInHostel: one(room_type_feeInHostel, {
		fields: [fee_planInHostel.fee_id],
		references: [room_type_feeInHostel.fee_id]
	}),
	hostel_registrationInHostel: one(hostel_registrationInHostel, {
		fields: [fee_planInHostel.registration_id],
		references: [hostel_registrationInHostel.registration_id]
	}),
	fee_demandInHostels: many(fee_demandInHostel),
}));

export const staff_space_assignmentInHostelRelations = relations(staff_space_assignmentInHostel, ({one}) => ({
	hostel_profileInHostel: one(hostel_profileInHostel, {
		fields: [staff_space_assignmentInHostel.facility_id],
		references: [hostel_profileInHostel.facility_id]
	}),
	roleInPortal: one(roleInPortal, {
		fields: [staff_space_assignmentInHostel.hostel_role],
		references: [roleInPortal.role_code]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [staff_space_assignmentInHostel.space_id],
		references: [spaceInInfra.space_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [staff_space_assignmentInHostel.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
	zoneInInfra: one(zoneInInfra, {
		fields: [staff_space_assignmentInHostel.zone_id],
		references: [zoneInInfra.zone_id]
	}),
}));

export const space_qrInHostelRelations = relations(space_qrInHostel, ({one}) => ({
	spaceInInfra: one(spaceInInfra, {
		fields: [space_qrInHostel.space_id],
		references: [spaceInInfra.space_id]
	}),
}));

export const room_meterInHostelRelations = relations(room_meterInHostel, ({one, many}) => ({
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [room_meterInHostel.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	spaceInInfra: one(spaceInInfra, {
		fields: [room_meterInHostel.space_id],
		references: [spaceInInfra.space_id]
	}),
	meter_student_mapInHostels: many(meter_student_mapInHostel),
	meter_readingInHostels: many(meter_readingInHostel),
	meter_rechargeInHostels: many(meter_rechargeInHostel),
	meter_monthly_usageInHostels: many(meter_monthly_usageInHostel),
}));

export const electricity_tariffInHostelRelations = relations(electricity_tariffInHostel, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [electricity_tariffInHostel.approved_by],
		references: [staff_masterInRef.staff_id]
	}),
	room_typeInHostel: one(room_typeInHostel, {
		fields: [electricity_tariffInHostel.room_type_id],
		references: [room_typeInHostel.room_type_id]
	}),
}));

export const meter_student_mapInHostelRelations = relations(meter_student_mapInHostel, ({one}) => ({
	hostel_allocationInHostel: one(hostel_allocationInHostel, {
		fields: [meter_student_mapInHostel.hostel_alloc_id],
		references: [hostel_allocationInHostel.hostel_alloc_id]
	}),
	room_meterInHostel: one(room_meterInHostel, {
		fields: [meter_student_mapInHostel.meter_id],
		references: [room_meterInHostel.meter_id]
	}),
}));

export const fee_receiptInHostelRelations = relations(fee_receiptInHostel, ({one, many}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [fee_receiptInHostel.collected_by],
		references: [staff_masterInRef.staff_id]
	}),
	fee_demandInHostel: one(fee_demandInHostel, {
		fields: [fee_receiptInHostel.demand_id],
		references: [fee_demandInHostel.demand_id]
	}),
	meter_rechargeInHostels: many(meter_rechargeInHostel),
}));

export const meter_readingInHostelRelations = relations(meter_readingInHostel, ({one}) => ({
	room_handoverInHostel: one(room_handoverInHostel, {
		fields: [meter_readingInHostel.handover_id],
		references: [room_handoverInHostel.handover_id]
	}),
	room_meterInHostel: one(room_meterInHostel, {
		fields: [meter_readingInHostel.meter_id],
		references: [room_meterInHostel.meter_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [meter_readingInHostel.read_by],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const meter_rechargeInHostelRelations = relations(meter_rechargeInHostel, ({one}) => ({
	room_meterInHostel: one(room_meterInHostel, {
		fields: [meter_rechargeInHostel.meter_id],
		references: [room_meterInHostel.meter_id]
	}),
	fee_receiptInHostel: one(fee_receiptInHostel, {
		fields: [meter_rechargeInHostel.receipt_id],
		references: [fee_receiptInHostel.receipt_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [meter_rechargeInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
}));

export const tracking_consentInHostelRelations = relations(tracking_consentInHostel, ({one}) => ({
	student_contactInHostel: one(student_contactInHostel, {
		fields: [tracking_consentInHostel.contact_id],
		references: [student_contactInHostel.contact_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [tracking_consentInHostel.recorded_by],
		references: [staff_masterInRef.staff_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [tracking_consentInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
}));

export const student_current_statusInHostelRelations = relations(student_current_statusInHostel, ({one}) => ({
	student_masterInRef: one(student_masterInRef, {
		fields: [student_current_statusInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
}));

export const hostel_alertInHostelRelations = relations(hostel_alertInHostel, ({one, many}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [hostel_alertInHostel.assigned_to],
		references: [staff_masterInRef.staff_id]
	}),
	hostel_profileInHostel: one(hostel_profileInHostel, {
		fields: [hostel_alertInHostel.facility_id],
		references: [hostel_profileInHostel.facility_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [hostel_alertInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	location_access_logInHostels: many(location_access_logInHostel),
}));

export const location_access_logInHostelRelations = relations(location_access_logInHostel, ({one}) => ({
	hostel_alertInHostel: one(hostel_alertInHostel, {
		fields: [location_access_logInHostel.alert_id],
		references: [hostel_alertInHostel.alert_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [location_access_logInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [location_access_logInHostel.viewer_staff_id],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const sick_leaveInHostelRelations = relations(sick_leaveInHostel, ({one, many}) => ({
	staff_masterInRef_approved_by: one(staff_masterInRef, {
		fields: [sick_leaveInHostel.approved_by],
		references: [staff_masterInRef.staff_id],
		relationName: "sick_leaveInHostel_approved_by_staff_masterInRef_staff_id"
	}),
	sick_leaveInHostel: one(sick_leaveInHostel, {
		fields: [sick_leaveInHostel.extended_from_id],
		references: [sick_leaveInHostel.sick_leave_id],
		relationName: "sick_leaveInHostel_extended_from_id_sick_leaveInHostel_sick_leave_id"
	}),
	sick_leaveInHostels: many(sick_leaveInHostel, {
		relationName: "sick_leaveInHostel_extended_from_id_sick_leaveInHostel_sick_leave_id"
	}),
	documentInShared: one(documentInShared, {
		fields: [sick_leaveInHostel.medical_doc_id],
		references: [documentInShared.doc_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [sick_leaveInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	staff_masterInRef_visited_by: one(staff_masterInRef, {
		fields: [sick_leaveInHostel.visited_by],
		references: [staff_masterInRef.staff_id],
		relationName: "sick_leaveInHostel_visited_by_staff_masterInRef_staff_id"
	}),
	sick_meal_deliveryInHostels: many(sick_meal_deliveryInHostel),
}));

export const outpassInHostelRelations = relations(outpassInHostel, ({one, many}) => ({
	student_masterInRef: one(student_masterInRef, {
		fields: [outpassInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
	movement_event_defaultInHostels: many(movement_event_defaultInHostel),
}));

export const vendor_categoryInPortalRelations = relations(vendor_categoryInPortal, ({one}) => ({
	categoryInPortal: one(categoryInPortal, {
		fields: [vendor_categoryInPortal.category_code],
		references: [categoryInPortal.category_code]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [vendor_categoryInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
}));

export const vendor_tagInPortalRelations = relations(vendor_tagInPortal, ({one}) => ({
	vendorInPortal: one(vendorInPortal, {
		fields: [vendor_tagInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
}));

export const material_aliasInPortalRelations = relations(material_aliasInPortal, ({one}) => ({
	materialInPortal: one(materialInPortal, {
		fields: [material_aliasInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const bom_componentInPortalRelations = relations(bom_componentInPortal, ({one}) => ({
	materialInPortal_component_sku: one(materialInPortal, {
		fields: [bom_componentInPortal.component_sku],
		references: [materialInPortal.sku],
		relationName: "bom_componentInPortal_component_sku_materialInPortal_sku"
	}),
	materialInPortal_parent_sku: one(materialInPortal, {
		fields: [bom_componentInPortal.parent_sku],
		references: [materialInPortal.sku],
		relationName: "bom_componentInPortal_parent_sku_materialInPortal_sku"
	}),
}));

export const stock_entry_findingInPortalRelations = relations(stock_entry_findingInPortal, ({one}) => ({
	stock_entryInPortal: one(stock_entryInPortal, {
		fields: [stock_entry_findingInPortal.entry_id],
		references: [stock_entryInPortal.entry_id]
	}),
}));

export const room_standard_inventoryInHostelRelations = relations(room_standard_inventoryInHostel, ({one}) => ({
	room_typeInHostel: one(room_typeInHostel, {
		fields: [room_standard_inventoryInHostel.room_type_id],
		references: [room_typeInHostel.room_type_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [room_standard_inventoryInHostel.sku],
		references: [materialInPortal.sku]
	}),
}));

export const material_standard_rateInPortalRelations = relations(material_standard_rateInPortal, ({one}) => ({
	materialInPortal: one(materialInPortal, {
		fields: [material_standard_rateInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const opening_stockInPortalRelations = relations(opening_stockInPortal, ({one}) => ({
	batchInPortal: one(batchInPortal, {
		fields: [opening_stockInPortal.batch_id],
		references: [batchInPortal.batch_id]
	}),
	locationInPortal: one(locationInPortal, {
		fields: [opening_stockInPortal.location_code],
		references: [locationInPortal.location_code]
	}),
}));

export const stock_reservationInPortalRelations = relations(stock_reservationInPortal, ({one}) => ({
	binInPortal: one(binInPortal, {
		fields: [stock_reservationInPortal.bin_code],
		references: [binInPortal.bin_code]
	}),
	indentInPortal: one(indentInPortal, {
		fields: [stock_reservationInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [stock_reservationInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const rfq_vendorInPortalRelations = relations(rfq_vendorInPortal, ({one}) => ({
	rfqInPortal: one(rfqInPortal, {
		fields: [rfq_vendorInPortal.rfq_id],
		references: [rfqInPortal.rfq_id]
	}),
	vendorInPortal: one(vendorInPortal, {
		fields: [rfq_vendorInPortal.vendor_id],
		references: [vendorInPortal.vendor_id]
	}),
}));

export const equipment_coverInPortalRelations = relations(equipment_coverInPortal, ({one}) => ({
	locationInPortal: one(locationInPortal, {
		fields: [equipment_coverInPortal.location_code],
		references: [locationInPortal.location_code]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [equipment_coverInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const report_visibilityInSharedRelations = relations(report_visibilityInShared, ({one}) => ({
	roleInPortal: one(roleInPortal, {
		fields: [report_visibilityInShared.role_code],
		references: [roleInPortal.role_code]
	}),
}));

export const deployment_eventInPortalRelations = relations(deployment_eventInPortal, ({one}) => ({
	app_userInPortal: one(app_userInPortal, {
		fields: [deployment_eventInPortal.actor_id],
		references: [app_userInPortal.user_id]
	}),
	deploymentInPortal: one(deploymentInPortal, {
		fields: [deployment_eventInPortal.deployment_id],
		references: [deploymentInPortal.deployment_id]
	}),
}));

export const stock_check_lineInPortalRelations = relations(stock_check_lineInPortal, ({one}) => ({
	stock_checkInPortal: one(stock_checkInPortal, {
		fields: [stock_check_lineInPortal.indent_id],
		references: [stock_checkInPortal.indent_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [stock_check_lineInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const amc_renewal_decisionInPortalRelations = relations(amc_renewal_decisionInPortal, ({one}) => ({
	app_userInPortal: one(app_userInPortal, {
		fields: [amc_renewal_decisionInPortal.actor_id],
		references: [app_userInPortal.user_id]
	}),
	amc_renewalInPortal: one(amc_renewalInPortal, {
		fields: [amc_renewal_decisionInPortal.renewal_id],
		references: [amc_renewalInPortal.renewal_id]
	}),
	roleInPortal: one(roleInPortal, {
		fields: [amc_renewal_decisionInPortal.role_code],
		references: [roleInPortal.role_code]
	}),
}));

export const room_handover_lineInHostelRelations = relations(room_handover_lineInHostel, ({one}) => ({
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [room_handover_lineInHostel.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	room_handoverInHostel: one(room_handoverInHostel, {
		fields: [room_handover_lineInHostel.handover_id],
		references: [room_handoverInHostel.handover_id]
	}),
}));

export const user_roleInPortalRelations = relations(user_roleInPortal, ({one}) => ({
	roleInPortal: one(roleInPortal, {
		fields: [user_roleInPortal.role_code],
		references: [roleInPortal.role_code]
	}),
	departmentInRef: one(departmentInRef, {
		fields: [user_roleInPortal.scope_dept],
		references: [departmentInRef.dept_code]
	}),
	app_userInPortal: one(app_userInPortal, {
		fields: [user_roleInPortal.user_id],
		references: [app_userInPortal.user_id]
	}),
}));

export const indent_eventInPortalRelations = relations(indent_eventInPortal, ({one}) => ({
	app_userInPortal: one(app_userInPortal, {
		fields: [indent_eventInPortal.actor_id],
		references: [app_userInPortal.user_id]
	}),
	indentInPortal: one(indentInPortal, {
		fields: [indent_eventInPortal.indent_id],
		references: [indentInPortal.indent_id]
	}),
	roleInPortal: one(roleInPortal, {
		fields: [indent_eventInPortal.role_code],
		references: [roleInPortal.role_code]
	}),
}));

export const new_request_eventInPortalRelations = relations(new_request_eventInPortal, ({one}) => ({
	app_userInPortal: one(app_userInPortal, {
		fields: [new_request_eventInPortal.actor_id],
		references: [app_userInPortal.user_id]
	}),
	new_requestInPortal: one(new_requestInPortal, {
		fields: [new_request_eventInPortal.request_id],
		references: [new_requestInPortal.request_id]
	}),
	roleInPortal: one(roleInPortal, {
		fields: [new_request_eventInPortal.role_code],
		references: [roleInPortal.role_code]
	}),
}));

export const po_eventInPortalRelations = relations(po_eventInPortal, ({one}) => ({
	app_userInPortal: one(app_userInPortal, {
		fields: [po_eventInPortal.actor_id],
		references: [app_userInPortal.user_id]
	}),
	purchase_orderInPortal: one(purchase_orderInPortal, {
		fields: [po_eventInPortal.po_id],
		references: [purchase_orderInPortal.po_id]
	}),
	roleInPortal: one(roleInPortal, {
		fields: [po_eventInPortal.role_code],
		references: [roleInPortal.role_code]
	}),
}));

export const material_issue_lineInPortalRelations = relations(material_issue_lineInPortal, ({one}) => ({
	asset_masterInInfra: one(asset_masterInInfra, {
		fields: [material_issue_lineInPortal.asset_id],
		references: [asset_masterInInfra.asset_id]
	}),
	batchInPortal: one(batchInPortal, {
		fields: [material_issue_lineInPortal.batch_id],
		references: [batchInPortal.batch_id]
	}),
	binInPortal: one(binInPortal, {
		fields: [material_issue_lineInPortal.bin_code],
		references: [binInPortal.bin_code]
	}),
	material_issueInPortal: one(material_issueInPortal, {
		fields: [material_issue_lineInPortal.issue_id],
		references: [material_issueInPortal.issue_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [material_issue_lineInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const meter_monthly_usageInHostelRelations = relations(meter_monthly_usageInHostel, ({one}) => ({
	room_meterInHostel: one(room_meterInHostel, {
		fields: [meter_monthly_usageInHostel.meter_id],
		references: [room_meterInHostel.meter_id]
	}),
}));

export const movement_event_defaultInHostelRelations = relations(movement_event_defaultInHostel, ({one}) => ({
	outpassInHostel: one(outpassInHostel, {
		fields: [movement_event_defaultInHostel.outpass_id],
		references: [outpassInHostel.outpass_id]
	}),
	capture_pointInHostel: one(capture_pointInHostel, {
		fields: [movement_event_defaultInHostel.point_id],
		references: [capture_pointInHostel.point_id]
	}),
	staff_masterInRef: one(staff_masterInRef, {
		fields: [movement_event_defaultInHostel.recorded_by],
		references: [staff_masterInRef.staff_id]
	}),
	student_masterInRef: one(student_masterInRef, {
		fields: [movement_event_defaultInHostel.student_id],
		references: [student_masterInRef.student_id]
	}),
}));

export const staff_addressInRefRelations = relations(staff_addressInRef, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [staff_addressInRef.staff_id],
		references: [staff_masterInRef.staff_id]
	}),
}));

export const sick_meal_deliveryInHostelRelations = relations(sick_meal_deliveryInHostel, ({one}) => ({
	staff_masterInRef: one(staff_masterInRef, {
		fields: [sick_meal_deliveryInHostel.delivered_by],
		references: [staff_masterInRef.staff_id]
	}),
	sick_leaveInHostel: one(sick_leaveInHostel, {
		fields: [sick_meal_deliveryInHostel.sick_leave_id],
		references: [sick_leaveInHostel.sick_leave_id]
	}),
}));

export const student_addressInRefRelations = relations(student_addressInRef, ({one}) => ({
	student_masterInRef: one(student_masterInRef, {
		fields: [student_addressInRef.student_id],
		references: [student_masterInRef.student_id]
	}),
}));

export const stock_sheet_lineInPortalRelations = relations(stock_sheet_lineInPortal, ({one}) => ({
	stock_sheetInPortal: one(stock_sheetInPortal, {
		fields: [stock_sheet_lineInPortal.sheet_id],
		references: [stock_sheetInPortal.sheet_id]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [stock_sheet_lineInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));

export const stock_sheetInPortalRelations = relations(stock_sheetInPortal, ({many}) => ({
	stock_sheet_lineInPortals: many(stock_sheet_lineInPortal),
}));

export const stockInPortalRelations = relations(stockInPortal, ({one}) => ({
	batchInPortal: one(batchInPortal, {
		fields: [stockInPortal.batch_id],
		references: [batchInPortal.batch_id]
	}),
	binInPortal: one(binInPortal, {
		fields: [stockInPortal.bin_code],
		references: [binInPortal.bin_code]
	}),
	materialInPortal: one(materialInPortal, {
		fields: [stockInPortal.sku],
		references: [materialInPortal.sku]
	}),
}));