import { pgTable, type AnyPgColumn, pgSchema, foreignKey, varchar, timestamp, numeric, smallint, integer, bigint, date, boolean, text, index, unique, check, time, uuid, char, uniqueIndex, primaryKey, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const ref = pgSchema("ref");
export const portal = pgSchema("portal");
export const infra = pgSchema("infra");
export const shared = pgSchema("shared");
export const hostel = pgSchema("hostel");
export const access_purposeInHostel = hostel.enum("access_purpose", ['Routine', 'Alert', 'Parent_Query', 'Emergency'])
export const alert_statusInHostel = hostel.enum("alert_status", ['Open', 'Acknowledged', 'Closed'])
export const alert_typeInHostel = hostel.enum("alert_type", ['No_Pass_Exit', 'Pass_Overdue', 'Not_Seen', 'Fee_Overdue', 'Meter_Low', 'Checklist_Missed', 'Register_Missed', 'Sick_Meal_Missed', 'Ticket_Not_Done', 'Instalment_Overdue'])
export const allocation_statusInHostel = hostel.enum("allocation_status", ['Active', 'Vacated', 'Transferred'])
export const assignment_statusInHostel = hostel.enum("assignment_status", ['Active', 'Ended'])
export const clearance_sectionInHostel = hostel.enum("clearance_section", ['Hostel_Office', 'Accounts', 'Mess', 'Electricity', 'Library', 'Floor_Warden'])
export const clearance_statusInHostel = hostel.enum("clearance_status", ['Pending', 'Cleared', 'Dues_Pending'])
export const consent_given_byInHostel = hostel.enum("consent_given_by", ['Student', 'Parent'])
export const contact_relationInHostel = hostel.enum("contact_relation", ['Self', 'Father', 'Mother', 'Guardian', 'Spouse', 'Brother', 'Sister', 'Communication', 'Other'])
export const cuisineInHostel = hostel.enum("cuisine", ['South_Indian', 'North_Indian', 'Veg', 'Non_Veg', 'Jain', 'Special_Diet'])
export const current_statusInHostel = hostel.enum("current_status", ['In_Room', 'In_Hostel', 'On_Campus', 'Outside_On_Pass', 'On_Sick_Leave', 'Outside_No_Pass', 'Overdue', 'Not_Seen'])
export const delivery_statusInHostel = hostel.enum("delivery_status", ['Pending', 'Delivered', 'Not_Required', 'Missed'])
export const demand_statusInHostel = hostel.enum("demand_status", ['Pending', 'Part_Paid', 'Paid', 'Overdue', 'Waived'])
export const device_statusInHostel = hostel.enum("device_status", ['Active', 'Faulty'])
export const device_typeInHostel = hostel.enum("device_type", ['Camera', 'Card_Reader', 'QR_Scanner', 'Manual'])
export const directionInHostel = hostel.enum("direction", ['In', 'Out'])
export const event_sourceInHostel = hostel.enum("event_source", ['Scan', 'Camera', 'Manual'])
export const fee_headInHostel = hostel.enum("fee_head", ['Registration', 'Hostel', 'Mess', 'Electricity', 'Damage', 'Fine', 'Convention_Centre'])
export const gateway_statusInHostel = hostel.enum("gateway_status", ['Success', 'Failed', 'Pending'])
export const handover_typeInHostel = hostel.enum("handover_type", ['Check_In', 'Check_Out'])
export const hostel_genderInHostel = hostel.enum("hostel_gender", ['Boys', 'Girls', 'Staff'])
export const hostel_statusInHostel = hostel.enum("hostel_status", ['Active', 'Closed'])
export const item_conditionInHostel = hostel.enum("item_condition", ['Good', 'Fair', 'Damaged', 'Missing'])
export const meal_slotInHostel = hostel.enum("meal_slot", ['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner'])
export const meter_statusInHostel = hostel.enum("meter_status", ['Active', 'Faulty', 'Replaced'])
export const meter_typeInHostel = hostel.enum("meter_type", ['Smart_Prepaid', 'Manual'])
export const occupant_typeInHostel = hostel.enum("occupant_type", ['Student', 'Staff'])
export const outing_categoryInHostel = hostel.enum("outing_category", ['Same_Day', 'Day_Or_More'])
export const outpass_statusInHostel = hostel.enum("outpass_status", ['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved', 'Approved', 'Rejected', 'Out', 'Returned', 'Overdue', 'Cancelled'])
export const payment_modeInHostel = hostel.enum("payment_mode", ['UPI', 'Card', 'Net_Banking', 'Cash', 'DD'])
export const plan_statusInHostel = hostel.enum("plan_status", ['Open', 'Fully_Paid', 'Cancelled'])
export const plan_typeInHostel = hostel.enum("plan_type", ['Single', 'Two_Instalments'])
export const point_typeInHostel = hostel.enum("point_type", ['Room_Corridor', 'Hostel_Gate', 'Campus_Gate', 'Mess', 'Facility', 'Academic_Block'])
export const punishment_statusInHostel = hostel.enum("punishment_status", ['In_Force', 'Served', 'Revoked'])
export const punishment_typeInHostel = hostel.enum("punishment_type", ['Warning', 'Fine', 'Outing_Ban', 'Hostel_Suspension', 'Expulsion', 'Community_Service'])
export const qr_statusInHostel = hostel.enum("qr_status", ['Active', 'Replaced'])
export const reading_sourceInHostel = hostel.enum("reading_source", ['Auto', 'Manual', 'Handover'])
export const recharge_statusInHostel = hostel.enum("recharge_status", ['Paid', 'Credited', 'Failed', 'Refunded'])
export const registration_statusInHostel = hostel.enum("registration_status", ['Applied', 'Fee_Paid', 'Waitlisted', 'Allotted', 'Accepted', 'Confirmed', 'Checked_In', 'Cancelled', 'Vacated'])
export const reserved_forInHostel = hostel.enum("reserved_for", ['None', 'Staff', 'Guest', 'Medical'])
export const severityInHostel = hostel.enum("severity", ['Info', 'Warning', 'Critical'])
export const shiftInHostel = hostel.enum("shift", ['Morning', 'Evening', 'Night', 'General'])
export const sick_leave_statusInHostel = hostel.enum("sick_leave_status", ['Applied', 'Recommended', 'Approved', 'Rejected', 'Closed'])
export const student_decisionInHostel = hostel.enum("student_decision", ['Pending', 'Accepted', 'Declined', 'Expired'])
export const subscription_statusInHostel = hostel.enum("subscription_status", ['Active', 'Suspended', 'Closed'])
export const vacate_reasonInHostel = hostel.enum("vacate_reason", ['Course_Completed', 'Semester_End', 'Transfer', 'Discipline', 'Medical', 'Personal', 'Other'])
export const vacate_statusInHostel = hostel.enum("vacate_status", ['Applied', 'L1_Approved', 'L2_Approved', 'L3_Approved', 'Approved', 'Rejected', 'Checked_Out', 'Cancelled'])
export const activity_typeInInfra = infra.enum("activity_type", ['Sports_Practice', 'Tournament', 'Seminar', 'Cultural', 'Club', 'Exam', 'External_Rental'])
export const alloc_statusInInfra = infra.enum("alloc_status", ['Active', 'Cancelled'])
export const amc_statusInInfra = infra.enum("amc_status", ['Active', 'Expired', 'Terminated'])
export const asset_categoryInInfra = infra.enum("asset_category", ['Furniture', 'Electrical', 'IT', 'Lab_Equipment', 'Sports_Equipment', 'Plumbing', 'Civil', 'Meter', 'Other'])
export const asset_conditionInInfra = infra.enum("asset_condition", ['Good', 'Fair', 'Poor', 'Scrap'])
export const avail_sourceInInfra = infra.enum("avail_source", ['Class', 'Lab', 'Booking', 'Maintenance'])
export const booking_statusInInfra = infra.enum("booking_status", ['Requested', 'Approved', 'Rejected', 'Completed', 'Cancelled'])
export const day_of_weekInInfra = infra.enum("day_of_week", ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
export const facility_statusInInfra = infra.enum("facility_status", ['Active', 'Under_Maintenance', 'Closed'])
export const facility_typeInInfra = infra.enum("facility_type", ['Academic', 'Hostel', 'Sports_Complex', 'Open_Ground', 'Admin', 'Library', 'Canteen', 'Convention_Centre', 'Store', 'Medical', 'Other'])
export const inspection_typeInInfra = infra.enum("inspection_type", ['Safety', 'Fire', 'Hygiene', 'Electrical', 'Ground_Condition'])
export const membership_statusInInfra = infra.enum("membership_status", ['Active', 'Expired'])
export const pm_frequencyInInfra = infra.enum("pm_frequency", ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'])
export const pm_statusInInfra = infra.enum("pm_status", ['Active', 'Suspended'])
export const priorityInInfra = infra.enum("priority", ['Low', 'Medium', 'High', 'Critical'])
export const raiser_typeInInfra = infra.enum("raiser_type", ['Student', 'Staff', 'Inspection', 'System'])
export const requester_typeInInfra = infra.enum("requester_type", ['Student', 'Staff', 'Dept', 'External'])
export const slot_typeInInfra = infra.enum("slot_type", ['Lecture', 'Lab', 'Break', 'Sports'])
export const space_categoryInInfra = infra.enum("space_category", ['Classroom', 'Laboratory', 'Seminar_Hall', 'Auditorium', 'Hostel_Room', 'Office', 'Indoor_Court', 'Outdoor_Field', 'Gym', 'Swimming_Pool', 'Store', 'Toilet_Block', 'Common_Area', 'Mess_Hall', 'Library_Room', 'Activity_Centre', 'Play_Room', 'Convention_Hall', 'Gate', 'Corridor'])
export const space_statusInInfra = infra.enum("space_status", ['Available', 'Occupied', 'Under_Maintenance', 'Decommissioned'])
export const subspace_statusInInfra = infra.enum("subspace_status", ['Vacant', 'Held', 'Occupied', 'Damaged'])
export const subspace_typeInInfra = infra.enum("subspace_type", ['Bed', 'Workstation', 'Seat', 'Lane', 'Court_Section'])
export const ticket_statusInInfra = infra.enum("ticket_status", ['Open', 'Assigned', 'In_Progress', 'Resolved', 'Closed', 'Reopened'])
export const utility_typeInInfra = infra.enum("utility_type", ['Electricity', 'Water', 'Gas', 'Internet'])
export const wo_statusInInfra = infra.enum("wo_status", ['Planned', 'In_Progress', 'Completed', 'Cancelled'])
export const zone_typeInInfra = infra.enum("zone_type", ['Floor', 'Wing', 'Outdoor_Zone'])
export const adjustment_typeInPortal = portal.enum("adjustment_type", ['Physical_Count_Variance', 'Damage', 'Expiry', 'Theft', 'Write_Off', 'Correction'])
export const advance_statusInPortal = portal.enum("advance_status", ['Paid', 'Partially_Adjusted', 'Fully_Adjusted', 'Refunded'])
export const alert_severityInPortal = portal.enum("alert_severity", ['Info', 'Warning', 'Critical'])
export const alert_statusInPortal = portal.enum("alert_status", ['Open', 'Acknowledged', 'Closed'])
export const amc_renewal_statusInPortal = portal.enum("amc_renewal_status", ['Proposed', 'Pending_Finance', 'Approved', 'Rejected', 'Renewed'])
export const approval_actionInPortal = portal.enum("approval_action", ['Approved', 'Rejected', 'Returned', 'Delegated'])
export const approval_statusInPortal = portal.enum("approval_status", ['Pending', 'Approved', 'Rejected'])
export const asset_tag_statusInPortal = portal.enum("asset_tag_status", ['In_Store', 'Installed', 'Under_Repair', 'Transferred', 'Scrapped', 'Disposed'])
export const audit_statusInPortal = portal.enum("audit_status", ['Clear', 'Flagged', 'Cleared_By_Review'])
export const bid_statusInPortal = portal.enum("bid_status", ['Received', 'Under_Evaluation', 'Ranked', 'Selected', 'Rejected'])
export const bin_statusInPortal = portal.enum("bin_status", ['Active', 'Blocked'])
export const budget_categoryInPortal = portal.enum("budget_category", ['Capital', 'Revenue_Consumables', 'Maintenance', 'Sports', 'Hostel', 'Lab', 'IT'])
export const budget_ref_typeInPortal = portal.enum("budget_ref_type", ['PR', 'PO', 'Invoice', 'Issue_Note', 'Adjustment', 'Hostel_Fee'])
export const budget_statusInPortal = portal.enum("budget_status", ['Active', 'Frozen', 'Closed'])
export const budget_txn_typeInPortal = portal.enum("budget_txn_type", ['Commitment', 'Commitment_Release', 'Utilisation', 'Reversal', 'Reallocation'])
export const capitalisation_statusInPortal = portal.enum("capitalisation_status", ['Capitalised', 'Transferred', 'Disposed'])
export const condition_statusInPortal = portal.enum("condition_status", ['Open', 'Met', 'Breached', 'Waived'])
export const count_statusInPortal = portal.enum("count_status", ['Planned', 'In_Progress', 'Completed', 'Reconciled'])
export const count_typeInPortal = portal.enum("count_type", ['Annual', 'Quarterly', 'Cycle', 'Surprise'])
export const deployment_statusInPortal = portal.enum("deployment_status", ['Requested', 'Approved', 'Planned', 'Site_Not_Ready', 'In_Progress', 'Installed', 'Commissioned', 'Handed_Over', 'Failed'])
export const depreciation_methodInPortal = portal.enum("depreciation_method", ['SLM', 'WDV'])
export const freight_paid_byInPortal = portal.enum("freight_paid_by", ['Vendor', 'Institute'])
export const fulfilment_sourceInPortal = portal.enum("fulfilment_source", ['Sub_Store', 'Central_Store_Transfer', 'Purchase', 'Not_Required'])
export const gate_statusInPortal = portal.enum("gate_status", ['Entered', 'Sent_To_Store', 'Exited'])
export const gl_account_typeInPortal = portal.enum("gl_account_type", ['Asset', 'Liability', 'Expense', 'Income', 'Equity'])
export const grn_statusInPortal = portal.enum("grn_status", ['Draft', 'Under_Inspection', 'Accepted', 'Partially_Accepted', 'Rejected', 'Posted'])
export const indent_line_statusInPortal = portal.enum("indent_line_status", ['Pending', 'Available', 'Transfer_Requested', 'Purchase_Requested', 'Issued', 'Closed'])
export const indent_priorityInPortal = portal.enum("indent_priority", ['Normal', 'Urgent', 'Emergency'])
export const indent_statusInPortal = portal.enum("indent_status", ['Draft', 'Submitted', 'HOD_Approved', 'Stores_Verified', 'Partially_Issued', 'Issued', 'Sent_To_Purchase', 'Closed', 'Rejected'])
export const inspection_kindInPortal = portal.enum("inspection_kind", ['Visual', 'Functional', 'Sample_Test', 'Full_Test', 'Third_Party'])
export const inspection_resultInPortal = portal.enum("inspection_result", ['Accepted', 'Partially_Accepted', 'Rejected'])
export const installed_by_typeInPortal = portal.enum("installed_by_type", ['Vendor', 'Internal_Maintenance_Team', 'Third_Party'])
export const invoice_statusInPortal = portal.enum("invoice_status", ['Received', 'Under_Verification', 'Approved', 'Partially_Paid', 'Paid', 'On_Hold', 'Rejected'])
export const issue_methodInPortal = portal.enum("issue_method", ['PIN', 'OTP', 'Signature'])
export const issue_statusInPortal = portal.enum("issue_status", ['Awaiting_Collection', 'Issued', 'Acknowledged', 'Partially_Returned', 'Closed'])
export const item_natureInPortal = portal.enum("item_nature", ['Consumable', 'Capital_Asset', 'Spare_Part', 'Service'])
export const journal_sourceInPortal = portal.enum("journal_source", ['GRN', 'Invoice', 'Payment', 'Issue_Note', 'Adjustment', 'Capitalisation', 'Debit_Note', 'Credit_Note', 'Hostel_Fee', 'Hostel_Damage', 'Meter_Recharge'])
export const journal_statusInPortal = portal.enum("journal_status", ['Draft', 'Posted', 'Reversed'])
export const ledger_groupInPortal = portal.enum("ledger_group", ['Purchase_Accounts', 'Sales_Accounts', 'Expense', 'Asset', 'Liability', 'Income', 'Equity'])
export const material_statusInPortal = portal.enum("material_status", ['Active', 'Discontinued', 'Blocked'])
export const matrix_doc_typeInPortal = portal.enum("matrix_doc_type", ['PR', 'PO', 'Payment', 'Indent', 'GRN', 'Invoice', 'Adjustment', 'Stock_Entry', 'Deployment'])
export const movement_typeInPortal = portal.enum("movement_type", ['Opening_Balance', 'Receipt', 'Issue', 'Transfer_Out', 'Transfer_In', 'Return_In', 'Return_To_Vendor', 'Adjustment_Plus', 'Adjustment_Minus', 'Scrap', 'Deployment', 'Physical_Count'])
export const new_request_statusInPortal = portal.enum("new_request_status", ['Submitted', 'Recommended', 'Price_Checked', 'Registered', 'Rejected'])
export const note_reasonInPortal = portal.enum("note_reason", ['Rejection', 'Short_Supply', 'Price_Difference', 'Penalty', 'Rate_Revision'])
export const note_statusInPortal = portal.enum("note_status", ['Raised', 'Accepted_By_Vendor', 'Adjusted', 'Closed'])
export const note_typeInPortal = portal.enum("note_type", ['Debit_Note', 'Credit_Note'])
export const pass_failInPortal = portal.enum("pass_fail", ['Pass', 'Fail'])
export const payment_modeInPortal = portal.enum("payment_mode", ['NEFT', 'RTGS', 'Cheque', 'UPI', 'Cash', 'DD'])
export const payment_statusInPortal = portal.enum("payment_status", ['Draft', 'Approved', 'Paid', 'Failed', 'Cancelled'])
export const payment_typeInPortal = portal.enum("payment_type", ['Advance', 'Against_Invoice', 'Retention_Release', 'Refund'])
export const po_change_typeInPortal = portal.enum("po_change_type", ['Qty', 'Price', 'Delivery_Date', 'Item_Spec', 'Terms', 'Cancellation'])
export const po_line_statusInPortal = portal.enum("po_line_status", ['Open', 'Partially_Received', 'Received', 'Closed'])
export const po_stageInPortal = portal.enum("po_stage", ['Draft', 'Approved', 'Sent', 'Acknowledged', 'Dispatched', 'In_Transit', 'Arrived_At_Gate', 'Partially_Received', 'Fully_Received', 'Invoiced', 'Closed', 'Cancelled', 'Short_Closed'])
export const po_typeInPortal = portal.enum("po_type", ['Standard', 'Rate_Contract', 'Blanket', 'Emergency', 'Service'])
export const pr_line_statusInPortal = portal.enum("pr_line_status", ['Open', 'RFQ', 'Ordered', 'Received', 'Closed'])
export const pr_statusInPortal = portal.enum("pr_status", ['Draft', 'Submitted', 'Approved', 'RFQ_Issued', 'PO_Created', 'Rejected', 'Cancelled'])
export const pr_typeInPortal = portal.enum("pr_type", ['Indent_Shortfall', 'Reorder', 'Capital_Project', 'Emergency', 'AMC_Service'])
export const qty_basisInPortal = portal.enum("qty_basis", ['as_written', 'added_up', 'needs_a_person'])
export const receipt_statusInPortal = portal.enum("receipt_status", ['Draft', 'Verified', 'Rejected'])
export const replenish_fromInPortal = portal.enum("replenish_from", ['Central_Store', 'Purchase'])
export const return_conditionInPortal = portal.enum("return_condition", ['Good', 'Repairable', 'Scrap'])
export const return_reasonInPortal = portal.enum("return_reason", ['Surplus', 'Defective', 'Wrong_Item', 'Project_Closed', 'Replacement'])
export const return_statusInPortal = portal.enum("return_status", ['Raised', 'Accepted', 'Rejected'])
export const rfq_modeInPortal = portal.enum("rfq_mode", ['Open_Tender', 'Limited_Tender', 'Single_Quote', 'GeM_Portal', 'Rate_Contract'])
export const rfq_responseInPortal = portal.enum("rfq_response", ['Invited', 'Quoted', 'Declined', 'No_Response'])
export const rfq_statusInPortal = portal.enum("rfq_status", ['Draft', 'Issued', 'Closed', 'Evaluated', 'Awarded', 'Cancelled'])
export const rtv_actionInPortal = portal.enum("rtv_action", ['Replace', 'Credit_Note', 'Refund', 'Repair'])
export const rtv_reasonInPortal = portal.enum("rtv_reason", ['Damaged', 'Spec_Mismatch', 'Excess', 'Expired', 'Defective_In_Warranty'])
export const rtv_statusInPortal = portal.enum("rtv_status", ['Raised', 'Vendor_Notified', 'Returned', 'Replaced', 'Credited', 'Closed'])
export const scoring_methodInPortal = portal.enum("scoring_method", ['Lowest_Best', 'Highest_Best', 'Manual_1_to_5'])
export const scrap_statusInPortal = portal.enum("scrap_status", ['Pending', 'Received_At_Store', 'Scrapped'])
export const serial_statusInPortal = portal.enum("serial_status", ['In_Store', 'Issued', 'Installed', 'Under_Repair', 'Scrapped'])
export const service_ticket_statusInPortal = portal.enum("service_ticket_status", ['Open', 'Vendor_Called', 'Repaired', 'Replaced', 'Closed'])
export const shipment_statusInPortal = portal.enum("shipment_status", ['Dispatched', 'In_Transit', 'At_Gate', 'Received', 'Damaged_In_Transit', 'Returned'])
export const spec_complianceInPortal = portal.enum("spec_compliance", ['Fully', 'Partially', 'Not_Compliant'])
export const storage_conditionInPortal = portal.enum("storage_condition", ['Normal', 'Cold', 'Hazardous', 'Secure'])
export const store_statusInPortal = portal.enum("store_status", ['Active', 'Closed'])
export const store_typeInPortal = portal.enum("store_type", ['Central', 'Department_SubStore', 'Hostel_SubStore', 'Sports_SubStore', 'Maintenance_SubStore', 'Lab_Store', 'Godown'])
export const tax_typeInPortal = portal.enum("tax_type", ['GST', 'TDS', 'Cess'])
export const taxabilityInPortal = portal.enum("taxability", ['Taxable', 'Exempt', 'Nil_Rated'])
export const test_resultInPortal = portal.enum("test_result", ['Pass', 'Fail', 'Conditional'])
export const three_way_matchInPortal = portal.enum("three_way_match", ['Matched', 'Qty_Mismatch', 'Price_Mismatch', 'Not_Matched'])
export const tracking_sourceInPortal = portal.enum("tracking_source", ['Vendor', 'Transporter_API', 'Store_Staff'])
export const transfer_statusInPortal = portal.enum("transfer_status", ['Requested', 'Approved', 'Dispatched', 'Received', 'Partially_Received', 'Cancelled'])
export const transfer_typeInPortal = portal.enum("transfer_type", ['Replenishment', 'Indent_Fulfilment', 'Rebalancing', 'Emergency'])
export const transport_modeInPortal = portal.enum("transport_mode", ['Road', 'Rail', 'Air', 'Courier'])
export const valuation_methodInPortal = portal.enum("valuation_method", ['FIFO', 'Weighted_Average', 'Standard', 'Average_Cost', 'Average_Price'])
export const vendor_statusInPortal = portal.enum("vendor_status", ['Active', 'Inactive', 'Blacklisted'])
export const vendor_typeInPortal = portal.enum("vendor_type", ['Manufacturer', 'Distributor', 'Dealer', 'Service_Provider', 'Transporter'])
export const address_typeInRef = ref.enum("address_type", ['Permanent', 'Present', 'Communication'])
export const admission_typeInRef = ref.enum("admission_type", ['Regular', 'Distance', 'Lateral_Entry'])
export const blood_groupInRef = ref.enum("blood_group", ['A+ve', 'A-ve', 'B+ve', 'B-ve', 'AB+ve', 'AB-ve', 'O+ve', 'O-ve', 'NA'])
export const caste_categoryInRef = ref.enum("caste_category", ['OC', 'BC', 'Other_BC', 'General', 'SC', 'ST', 'EWS', 'NA'])
export const genderInRef = ref.enum("gender", ['Male', 'Female', 'Other'])
export const indoor_outdoorInRef = ref.enum("indoor_outdoor", ['Indoor', 'Outdoor'])
export const marital_statusInRef = ref.enum("marital_status", ['Single', 'Married', 'Divorced', 'Widowed', 'NA'])
export const offering_modeInRef = ref.enum("offering_mode", ['Regular', 'Regular_PBL', 'Part_Time', 'Full_Time', 'Online', 'Distance'])
export const recruitment_typeInRef = ref.enum("recruitment_type", ['Permanent', 'Adhoc', 'Contract', 'Outsourced', 'Visiting'])
export const relationInRef = ref.enum("relation", ['Self', 'Father', 'Mother', 'Guardian', 'Spouse', 'Brother', 'Sister', 'Son', 'Daughter', 'Communication', 'Other'])
export const staff_typeInRef = ref.enum("staff_type", ['Faculty', 'Warden', 'Lab_Assistant', 'Maintenance', 'Sports_Coach', 'Admin', 'Security', 'Housekeeping', 'Mess', 'Medical', 'Counsellor', 'Other'])
export const student_statusInRef = ref.enum("student_status", ['Active', 'Cancelled', 'Suspended', 'Alumni'])
export const student_typeInRef = ref.enum("student_type", ['UG', 'PG', 'PhD', 'Certificate', 'Graduate_Diploma', 'PG_Diploma', 'PDF', 'JRF', 'SRF', 'Other'])
export const subject_typeInRef = ref.enum("subject_type", ['Theory', 'Lab'])
export const active_statusInShared = shared.enum("active_status", ['Active', 'Inactive'])
export const channelInShared = shared.enum("channel", ['SMS', 'WhatsApp', 'Email', 'Push', 'In_App'])
export const decisionInShared = shared.enum("decision", ['Pending', 'Recommended', 'Approved', 'Rejected', 'Skipped', 'Expired'])
export const delivery_statusInShared = shared.enum("delivery_status", ['Queued', 'Sent', 'Delivered', 'Failed', 'Read'])
export const document_kindInShared = shared.enum("document_kind", ['Invoice', 'Delivery_Challan', 'Donation_Letter', 'Quotation', 'Test_Report', 'Medical_Note', 'Photo', 'Handover_Sheet', 'QR_Label', 'Receipt', 'Consent_Form', 'Other'])
export const import_sourceInShared = shared.enum("import_source", ['ERP_Student', 'ERP_Staff', 'ERP_Department', 'Academic_Attendance', 'Academic_Marks', 'Academic_Term', 'Infra_Space', 'Portal_Material'])
export const import_statusInShared = shared.enum("import_status", ['Received', 'Processing', 'Completed', 'Failed', 'Partially_Completed'])
export const recipient_typeInShared = shared.enum("recipient_type", ['Student', 'Parent', 'Staff'])
export const request_typeInShared = shared.enum("request_type", ['Outpass', 'Sick_Leave', 'Vacate', 'Discipline', 'Convention_Booking', 'Hostel_Registration', 'Indent'])
export const visibility_scopeInShared = shared.enum("visibility_scope", ['Own', 'Floor', 'Hostel', 'All'])

export const audit_log_audit_id_seqInShared = shared.sequence("audit_log_audit_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })
export const movement_event_event_id_seqInHostel = hostel.sequence("movement_event_event_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false })

export const departmentInRef = ref.table("department", {
	dept_code: varchar({ length: 20 }).primaryKey().notNull(),
	dept_name: varchar({ length: 120 }).notNull(),
	hod_staff_id: varchar({ length: 20 }),
	status: active_statusInShared().default('Active').notNull(),
	synced_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.hod_staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "fk_department_hod"
		}),
]);

export const courseInRef = ref.table("course", {
	course_id: varchar({ length: 30 }).primaryKey().notNull(),
	dept_code: varchar({ length: 20 }).notNull(),
	course_name: varchar({ length: 120 }).notNull(),
	duration_years: numeric({ precision: 3, scale:  1 }),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "course_dept_code_fkey"
		}),
]);

export const sectionInRef = ref.table("section", {
	section_id: varchar({ length: 30 }).primaryKey().notNull(),
	course_id: varchar({ length: 30 }).notNull(),
	year: smallint().notNull(),
	section_name: varchar({ length: 30 }).notNull(),
	strength: integer(),
	class_advisor_id: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.class_advisor_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "fk_section_advisor"
		}),
	foreignKey({
			columns: [table.course_id],
			foreignColumns: [courseInRef.course_id],
			name: "section_course_id_fkey"
		}),
]);

export const batchInRef = ref.table("batch", {
	batch_id: varchar({ length: 30 }).primaryKey().notNull(),
	section_id: varchar({ length: 30 }).notNull(),
	batch_name: varchar({ length: 30 }).notNull(),
	size: integer(),
}, (table) => [
	foreignKey({
			columns: [table.section_id],
			foreignColumns: [sectionInRef.section_id],
			name: "batch_section_id_fkey"
		}),
]);

export const subjectInRef = ref.table("subject", {
	subject_id: varchar({ length: 30 }).primaryKey().notNull(),
	course_id: varchar({ length: 30 }).notNull(),
	subject_name: varchar({ length: 120 }).notNull(),
	subject_type: subject_typeInRef().notNull(),
	credits: numeric({ precision: 3, scale:  1 }),
}, (table) => [
	foreignKey({
			columns: [table.course_id],
			foreignColumns: [courseInRef.course_id],
			name: "subject_course_id_fkey"
		}),
]);

export const staff_qualificationInRef = ref.table("staff_qualification", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	qualification_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "ref.staff_qualification_qualification_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	staff_id: varchar({ length: 20 }).notNull(),
	degree: varchar({ length: 60 }),
	specialization: varchar({ length: 120 }),
	university: varchar({ length: 160 }),
	college: varchar({ length: 160 }),
	cgpa_or_pct: numeric({ precision: 6, scale:  2 }),
	year_of_passing: smallint(),
}, (table) => [
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "staff_qualification_staff_id_fkey"
		}).onDelete("cascade"),
]);

export const staff_masterInRef = ref.table("staff_master", {
	staff_id: varchar({ length: 20 }).primaryKey().notNull(),
	salutation: varchar({ length: 10 }),
	first_name: varchar({ length: 80 }).notNull(),
	middle_name: varchar({ length: 80 }),
	last_name: varchar({ length: 80 }),
	full_name: varchar({ length: 200 }).generatedAlwaysAs(sql`btrim(((((first_name)::text || ' '::text) || COALESCE(((middle_name)::text || ' '::text), ''::text)) || (COALESCE(last_name, ''::character varying))::text))`),
	gender: genderInRef().notNull(),
	date_of_birth: date(),
	blood_group: blood_groupInRef(),
	caste_category: caste_categoryInRef(),
	disability: varchar({ length: 60 }),
	marital_status: marital_statusInRef(),
	nationality: varchar({ length: 40 }),
	religion: varchar({ length: 40 }),
	mother_tongue: varchar({ length: 40 }),
	birth_place: varchar({ length: 80 }),
	father_name: varchar({ length: 120 }),
	mother_name: varchar({ length: 120 }),
	height_cm: numeric({ precision: 5, scale:  1 }),
	weight_kg: numeric({ precision: 5, scale:  1 }),
	pf_number: varchar({ length: 30 }),
	joining_date: date(),
	dept_code: varchar({ length: 20 }).notNull(),
	designation: varchar({ length: 80 }).notNull(),
	staff_type: staff_typeInRef().default('Other').notNull(),
	recruitment_type: recruitment_typeInRef(),
	recruit_agency: varchar({ length: 80 }),
	campus_code: varchar({ length: 20 }),
	personal_email: varchar({ length: 120 }),
	official_email: varchar({ length: 120 }),
	mobile_no: varchar({ length: 15 }).notNull(),
	communication_no: varchar({ length: 15 }),
	photo_object_key: varchar({ length: 200 }),
	resume_link: varchar({ length: 300 }),
	status: active_statusInShared().default('Active').notNull(),
	synced_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	import_batch_id: bigint({ mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.campus_code],
			foreignColumns: [campusInInfra.campus_id],
			name: "fk_staff_campus"
		}),
	foreignKey({
			columns: [table.import_batch_id],
			foreignColumns: [import_batchInShared.batch_id],
			name: "fk_staff_import"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "staff_master_dept_code_fkey"
		}),
]);

export const staff_contactInRef = ref.table("staff_contact", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contact_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "ref.staff_contact_contact_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	staff_id: varchar({ length: 20 }).notNull(),
	contact_type: varchar({ length: 30 }).notNull(),
	contact_person: varchar({ length: 120 }),
	phone_number: varchar({ length: 15 }).notNull(),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "staff_contact_staff_id_fkey"
		}).onDelete("cascade"),
]);

export const staff_dependentInRef = ref.table("staff_dependent", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	dependent_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "ref.staff_dependent_dependent_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	staff_id: varchar({ length: 20 }).notNull(),
	relation: relationInRef().notNull(),
	full_name: varchar({ length: 160 }).notNull(),
	date_of_birth: date(),
	gender: genderInRef(),
	is_nominee: boolean().default(false).notNull(),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "staff_dependent_staff_id_fkey"
		}).onDelete("cascade"),
]);

export const staff_employment_historyInRef = ref.table("staff_employment_history", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	employment_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "ref.staff_employment_history_employment_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	staff_id: varchar({ length: 20 }).notNull(),
	employer_name: varchar({ length: 160 }).notNull(),
	job_type: varchar({ length: 40 }),
	designation: varchar({ length: 80 }),
	joining_date: date(),
	leaving_date: date(),
	salary: numeric({ precision: 12, scale:  2 }),
	employer_address: text(),
	city: varchar({ length: 80 }),
	state: varchar({ length: 80 }),
	country: varchar({ length: 60 }),
}, (table) => [
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "staff_employment_history_staff_id_fkey"
		}).onDelete("cascade"),
]);

export const staff_membershipInRef = ref.table("staff_membership", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	membership_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "ref.staff_membership_membership_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	staff_id: varchar({ length: 20 }).notNull(),
	body_name: varchar({ length: 160 }).notNull(),
	membership_no: varchar({ length: 60 }),
	subscription: varchar({ length: 40 }),
	from_date: date(),
	end_date: date(),
}, (table) => [
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "staff_membership_staff_id_fkey"
		}).onDelete("cascade"),
]);

export const sportInRef = ref.table("sport", {
	sport_id: varchar({ length: 30 }).primaryKey().notNull(),
	sport_name: varchar({ length: 80 }).notNull(),
	indoor_outdoor: indoor_outdoorInRef().notNull(),
	default_space_id: varchar({ length: 30 }),
}, (table) => [
	foreignKey({
			columns: [table.default_space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "fk_sport_space"
		}),
]);

export const staff_responsibilityInRef = ref.table("staff_responsibility", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	responsibility_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "ref.staff_responsibility_responsibility_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	staff_id: varchar({ length: 20 }).notNull(),
	designation: varchar({ length: 120 }).notNull(),
	start_date: date(),
	end_date: date(),
}, (table) => [
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "staff_responsibility_staff_id_fkey"
		}).onDelete("cascade"),
]);

export const student_masterInRef = ref.table("student_master", {
	student_id: varchar({ length: 20 }).primaryKey().notNull(),
	full_name: varchar({ length: 160 }).notNull(),
	admission_type: admission_typeInRef().default('Regular').notNull(),
	father_name: varchar({ length: 120 }),
	mother_name: varchar({ length: 120 }),
	regulation: varchar({ length: 10 }),
	student_type: student_typeInRef().notNull(),
	course_id: varchar({ length: 30 }),
	programme: varchar({ length: 80 }).notNull(),
	offering_mode: offering_modeInRef(),
	section_id: varchar({ length: 30 }),
	year_semester: varchar({ length: 20 }),
	gender: genderInRef().notNull(),
	date_of_birth: date().notNull(),
	caste_category: caste_categoryInRef(),
	economic_status: varchar({ length: 20 }),
	family_income_band: varchar({ length: 20 }),
	nationality: varchar({ length: 40 }).default('indian').notNull(),
	religion: varchar({ length: 40 }),
	blood_group: blood_groupInRef(),
	disability: varchar({ length: 60 }),
	personal_email: varchar({ length: 120 }).notNull(),
	admission_date: date(),
	kleee_application_id: varchar({ length: 40 }),
	seat_status: varchar({ length: 20 }),
	dept_code: varchar({ length: 20 }),
	counsellor_id: varchar({ length: 20 }),
	photo_object_key: varchar({ length: 200 }),
	is_hosteller: boolean().default(false).notNull(),
	status: student_statusInRef().default('Active').notNull(),
	synced_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	import_batch_id: bigint({ mode: "number" }),
}, (table) => [
	index("ix_student_master_dept").using("btree", table.dept_code.asc().nullsLast().op("text_ops")),
	index("ix_student_master_gender").using("btree", table.gender.asc().nullsLast().op("enum_ops")).where(sql`(status = 'Active'::ref.student_status)`),
	foreignKey({
			columns: [table.import_batch_id],
			foreignColumns: [import_batchInShared.batch_id],
			name: "fk_student_import"
		}),
	foreignKey({
			columns: [table.counsellor_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "student_master_counsellor_id_fkey"
		}),
	foreignKey({
			columns: [table.course_id],
			foreignColumns: [courseInRef.course_id],
			name: "student_master_course_id_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "student_master_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.section_id],
			foreignColumns: [sectionInRef.section_id],
			name: "student_master_section_id_fkey"
		}),
]);

export const roleInPortal = portal.table("role", {
	role_code: varchar({ length: 30 }).primaryKey().notNull(),
	name: varchar({ length: 80 }).notNull(),
	module: varchar({ length: 20 }).default('portal').notNull(),
});

export const campusInInfra = infra.table("campus", {
	campus_id: varchar({ length: 20 }).primaryKey().notNull(),
	campus_name: varchar({ length: 100 }).notNull(),
	address: text(),
	total_area: numeric({ precision: 12, scale:  2 }),
	status: active_statusInShared().default('Active').notNull(),
});

export const facilityInInfra = infra.table("facility", {
	facility_id: varchar({ length: 30 }).primaryKey().notNull(),
	campus_id: varchar({ length: 20 }).notNull(),
	facility_name: varchar({ length: 120 }).notNull(),
	facility_type: facility_typeInInfra().notNull(),
	area_sqm: numeric({ precision: 12, scale:  2 }),
	no_of_floors: smallint().default(0).notNull(),
	year_built: smallint(),
	incharge_id: varchar({ length: 20 }),
	status: facility_statusInInfra().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.campus_id],
			foreignColumns: [campusInInfra.campus_id],
			name: "facility_campus_id_fkey"
		}),
	foreignKey({
			columns: [table.incharge_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "facility_incharge_id_fkey"
		}),
]);

export const zoneInInfra = infra.table("zone", {
	zone_id: varchar({ length: 30 }).primaryKey().notNull(),
	facility_id: varchar({ length: 30 }).notNull(),
	zone_name: varchar({ length: 80 }).notNull(),
	zone_type: zone_typeInInfra().notNull(),
	sequence_no: smallint(),
}, (table) => [
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "zone_facility_id_fkey"
		}),
]);

export const spaceInInfra = infra.table("space", {
	space_id: varchar({ length: 30 }).primaryKey().notNull(),
	zone_id: varchar({ length: 30 }).notNull(),
	space_code: varchar({ length: 30 }).notNull(),
	space_name: varchar({ length: 120 }).notNull(),
	space_category: space_categoryInInfra().notNull(),
	capacity: integer(),
	area_sqm: numeric({ precision: 10, scale:  2 }),
	has_ac: boolean().default(false).notNull(),
	has_projector: boolean().default(false).notNull(),
	is_bookable: boolean().default(false).notNull(),
	booking_rate: numeric({ precision: 12, scale:  2 }),
	status: space_statusInInfra().default('Available').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.zone_id],
			foreignColumns: [zoneInInfra.zone_id],
			name: "space_zone_id_fkey"
		}),
	unique("space_zone_id_space_code_key").on(table.space_code, table.zone_id),
]);

export const subspaceInInfra = infra.table("subspace", {
	subspace_id: varchar({ length: 30 }).primaryKey().notNull(),
	space_id: varchar({ length: 30 }).notNull(),
	subspace_code: varchar({ length: 30 }).notNull(),
	subspace_type: subspace_typeInInfra().notNull(),
	status: subspace_statusInInfra().default('Vacant').notNull(),
}, (table) => [
	index("ix_subspace_space_status").using("btree", table.space_id.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "subspace_space_id_fkey"
		}),
	unique("subspace_space_id_subspace_code_key").on(table.space_id, table.subspace_code),
]);

export const asset_masterInInfra = infra.table("asset_master", {
	asset_id: varchar({ length: 40 }).primaryKey().notNull(),
	space_id: varchar({ length: 30 }),
	asset_name: varchar({ length: 120 }).notNull(),
	asset_category: asset_categoryInInfra().notNull(),
	make_model: varchar({ length: 120 }),
	serial_no: varchar({ length: 80 }),
	purchase_date: date(),
	cost: numeric({ precision: 14, scale:  2 }),
	warranty_expiry: date(),
	vendor_id: varchar({ length: 20 }),
	condition: asset_conditionInInfra().default('Good').notNull(),
	last_service_date: date(),
	sku: varchar({ length: 30 }),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	index("ix_asset_space").using("btree", table.space_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "asset_master_space_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "fk_asset_sku"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "fk_asset_vendor"
		}),
]);

export const class_allocationInInfra = infra.table("class_allocation", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	class_alloc_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.class_allocation_class_alloc_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	academic_year: varchar({ length: 9 }).notNull(),
	semester: varchar({ length: 10 }).notNull(),
	section_id: varchar({ length: 30 }).notNull(),
	subject_id: varchar({ length: 30 }).notNull(),
	faculty_id: varchar({ length: 20 }).notNull(),
	space_id: varchar({ length: 30 }).notNull(),
	slot_id: varchar({ length: 20 }).notNull(),
	effective_from: date().notNull(),
	effective_to: date(),
	status: alloc_statusInInfra().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.faculty_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "class_allocation_faculty_id_fkey"
		}),
	foreignKey({
			columns: [table.section_id],
			foreignColumns: [sectionInRef.section_id],
			name: "class_allocation_section_id_fkey"
		}),
	foreignKey({
			columns: [table.slot_id],
			foreignColumns: [timetable_slotInInfra.slot_id],
			name: "class_allocation_slot_id_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "class_allocation_space_id_fkey"
		}),
	foreignKey({
			columns: [table.subject_id],
			foreignColumns: [subjectInRef.subject_id],
			name: "class_allocation_subject_id_fkey"
		}),
]);

export const timetable_slotInInfra = infra.table("timetable_slot", {
	slot_id: varchar({ length: 20 }).primaryKey().notNull(),
	day_of_week: day_of_weekInInfra().notNull(),
	start_time: time().notNull(),
	end_time: time().notNull(),
	slot_type: slot_typeInInfra().notNull(),
}, (table) => [
	check("timetable_slot_check", sql`end_time > start_time`),
]);

export const lab_allocationInInfra = infra.table("lab_allocation", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lab_alloc_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.lab_allocation_lab_alloc_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	space_id: varchar({ length: 30 }).notNull(),
	subject_id: varchar({ length: 30 }).notNull(),
	batch_id: varchar({ length: 30 }).notNull(),
	faculty_id: varchar({ length: 20 }).notNull(),
	lab_assistant_id: varchar({ length: 20 }),
	slot_id: varchar({ length: 20 }).notNull(),
	academic_year: varchar({ length: 9 }).notNull(),
	max_students: integer(),
	status: alloc_statusInInfra().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.batch_id],
			foreignColumns: [batchInRef.batch_id],
			name: "lab_allocation_batch_id_fkey"
		}),
	foreignKey({
			columns: [table.faculty_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "lab_allocation_faculty_id_fkey"
		}),
	foreignKey({
			columns: [table.lab_assistant_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "lab_allocation_lab_assistant_id_fkey"
		}),
	foreignKey({
			columns: [table.slot_id],
			foreignColumns: [timetable_slotInInfra.slot_id],
			name: "lab_allocation_slot_id_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "lab_allocation_space_id_fkey"
		}),
	foreignKey({
			columns: [table.subject_id],
			foreignColumns: [subjectInRef.subject_id],
			name: "lab_allocation_subject_id_fkey"
		}),
]);

export const lab_workstation_mapInInfra = infra.table("lab_workstation_map", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	ws_map_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.lab_workstation_map_ws_map_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lab_alloc_id: bigint({ mode: "number" }).notNull(),
	subspace_id: varchar({ length: 30 }).notNull(),
	student_id: varchar({ length: 20 }).notNull(),
	assigned_date: date().default(sql`CURRENT_DATE`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.lab_alloc_id],
			foreignColumns: [lab_allocationInInfra.lab_alloc_id],
			name: "lab_workstation_map_lab_alloc_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "lab_workstation_map_student_id_fkey"
		}),
	foreignKey({
			columns: [table.subspace_id],
			foreignColumns: [subspaceInInfra.subspace_id],
			name: "lab_workstation_map_subspace_id_fkey"
		}),
]);

export const activity_bookingInInfra = infra.table("activity_booking", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	booking_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.activity_booking_booking_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	space_id: varchar({ length: 30 }).notNull(),
	activity_type: activity_typeInInfra().notNull(),
	activity_name: varchar({ length: 160 }).notNull(),
	requested_by: varchar({ length: 40 }).notNull(),
	requester_type: requester_typeInInfra().notNull(),
	booking_date: date().notNull(),
	start_time: time().notNull(),
	end_time: time().notNull(),
	expected_participants: integer(),
	approved_by: varchar({ length: 20 }),
	booking_charges: numeric({ precision: 12, scale:  2 }),
	status: booking_statusInInfra().default('Requested').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "activity_booking_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "activity_booking_space_id_fkey"
		}),
	check("activity_booking_check", sql`end_time > start_time`),
]);

export const sports_membershipInInfra = infra.table("sports_membership", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sport_member_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.sports_membership_sport_member_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	student_id: varchar({ length: 20 }).notNull(),
	sport_id: varchar({ length: 30 }).notNull(),
	coach_id: varchar({ length: 20 }),
	team_name: varchar({ length: 80 }),
	membership_start: date().notNull(),
	membership_end: date(),
	status: membership_statusInInfra().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.coach_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "sports_membership_coach_id_fkey"
		}),
	foreignKey({
			columns: [table.sport_id],
			foreignColumns: [sportInRef.sport_id],
			name: "sports_membership_sport_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "sports_membership_student_id_fkey"
		}),
]);

export const space_availability_logInInfra = infra.table("space_availability_log", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	avail_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.space_availability_log_avail_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	space_id: varchar({ length: 30 }).notNull(),
	date: date().notNull(),
	start_time: time().notNull(),
	end_time: time().notNull(),
	source_type: avail_sourceInInfra().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	source_id: bigint({ mode: "number" }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "space_availability_log_space_id_fkey"
		}),
	check("space_availability_log_check", sql`end_time > start_time`),
]);

export const maintenance_categoryInInfra = infra.table("maintenance_category", {
	category_id: varchar({ length: 20 }).primaryKey().notNull(),
	category_name: varchar({ length: 80 }).notNull(),
	default_sla_hours: integer(),
	default_team_id: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.default_team_id],
			foreignColumns: [maintenance_teamInInfra.team_id],
			name: "fk_cat_team"
		}),
]);

export const maintenance_teamInInfra = infra.table("maintenance_team", {
	team_id: varchar({ length: 20 }).primaryKey().notNull(),
	team_name: varchar({ length: 80 }).notNull(),
	category_id: varchar({ length: 20 }),
	supervisor_id: varchar({ length: 20 }),
	contact: varchar({ length: 60 }),
}, (table) => [
	foreignKey({
			columns: [table.category_id],
			foreignColumns: [maintenance_categoryInInfra.category_id],
			name: "maintenance_team_category_id_fkey"
		}),
	foreignKey({
			columns: [table.supervisor_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "maintenance_team_supervisor_id_fkey"
		}),
]);

export const technicianInInfra = infra.table("technician", {
	technician_id: varchar({ length: 20 }).primaryKey().notNull(),
	staff_id: varchar({ length: 20 }),
	team_id: varchar({ length: 20 }),
	skill_set: varchar({ length: 160 }),
	shift: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "technician_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.team_id],
			foreignColumns: [maintenance_teamInInfra.team_id],
			name: "technician_team_id_fkey"
		}),
]);

export const maintenance_ticketInInfra = infra.table("maintenance_ticket", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	ticket_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.maintenance_ticket_ticket_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	raised_by: varchar({ length: 40 }).notNull(),
	raiser_type: raiser_typeInInfra().notNull(),
	facility_id: varchar({ length: 30 }).notNull(),
	space_id: varchar({ length: 30 }),
	asset_id: varchar({ length: 40 }),
	category_id: varchar({ length: 20 }).notNull(),
	description: text().notNull(),
	priority: priorityInInfra().default('Medium').notNull(),
	raised_date: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	assigned_to: varchar({ length: 20 }),
	assigned_date: timestamp({ withTimezone: true, mode: 'string' }),
	resolved_date: timestamp({ withTimezone: true, mode: 'string' }),
	resolution_notes: text(),
	cost_incurred: numeric({ precision: 12, scale:  2 }),
	feedback_rating: smallint(),
	status: ticket_statusInInfra().default('Open').notNull(),
	verified_by: varchar({ length: 20 }),
	verified_at: timestamp({ withTimezone: true, mode: 'string' }),
	deadline_at: timestamp({ withTimezone: true, mode: 'string' }),
	closure_report: text(),
	auto_closed: boolean().default(false).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	follow_up_of: bigint({ mode: "number" }),
}, (table) => [
	index("ix_ticket_facility_status").using("btree", table.facility_id.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "maintenance_ticket_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.assigned_to],
			foreignColumns: [technicianInInfra.technician_id],
			name: "maintenance_ticket_assigned_to_fkey"
		}),
	foreignKey({
			columns: [table.category_id],
			foreignColumns: [maintenance_categoryInInfra.category_id],
			name: "maintenance_ticket_category_id_fkey"
		}),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "maintenance_ticket_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.follow_up_of],
			foreignColumns: [table.ticket_id],
			name: "maintenance_ticket_follow_up_of_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "maintenance_ticket_space_id_fkey"
		}),
	foreignKey({
			columns: [table.verified_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "maintenance_ticket_verified_by_fkey"
		}),
	check("maintenance_ticket_feedback_rating_check", sql`(feedback_rating >= 1) AND (feedback_rating <= 5)`),
]);

export const inspection_logInInfra = infra.table("inspection_log", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	inspection_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.inspection_log_inspection_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	facility_id: varchar({ length: 30 }).notNull(),
	space_id: varchar({ length: 30 }),
	inspection_type: inspection_typeInInfra().notNull(),
	inspector_id: varchar({ length: 40 }).notNull(),
	inspection_date: date().notNull(),
	findings: text(),
	score: numeric({ precision: 5, scale:  2 }),
	action_required: boolean().default(false).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	ticket_id: bigint({ mode: "number" }),
	next_inspection_date: date(),
}, (table) => [
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "inspection_log_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "inspection_log_space_id_fkey"
		}),
	foreignKey({
			columns: [table.ticket_id],
			foreignColumns: [maintenance_ticketInInfra.ticket_id],
			name: "inspection_log_ticket_id_fkey"
		}),
]);

export const pm_scheduleInInfra = infra.table("pm_schedule", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pm_schedule_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.pm_schedule_pm_schedule_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	asset_id: varchar({ length: 40 }),
	space_id: varchar({ length: 30 }),
	category_id: varchar({ length: 20 }).notNull(),
	frequency: pm_frequencyInInfra().notNull(),
	task_checklist: text(),
	last_done_date: date(),
	next_due_date: date(),
	assigned_team_id: varchar({ length: 20 }),
	status: pm_statusInInfra().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "pm_schedule_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.assigned_team_id],
			foreignColumns: [maintenance_teamInInfra.team_id],
			name: "pm_schedule_assigned_team_id_fkey"
		}),
	foreignKey({
			columns: [table.category_id],
			foreignColumns: [maintenance_categoryInInfra.category_id],
			name: "pm_schedule_category_id_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "pm_schedule_space_id_fkey"
		}),
	check("pm_schedule_check", sql`(asset_id IS NOT NULL) OR (space_id IS NOT NULL)`),
]);

export const work_orderInInfra = infra.table("work_order", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	work_order_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.work_order_work_order_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	ticket_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pm_schedule_id: bigint({ mode: "number" }),
	technician_id: varchar({ length: 20 }),
	vendor_id: varchar({ length: 20 }),
	scheduled_date: date(),
	actual_start: timestamp({ withTimezone: true, mode: 'string' }),
	actual_end: timestamp({ withTimezone: true, mode: 'string' }),
	labour_hours: numeric({ precision: 8, scale:  2 }),
	total_cost: numeric({ precision: 12, scale:  2 }),
	downtime_hours: numeric({ precision: 8, scale:  2 }),
	status: wo_statusInInfra().default('Planned').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "fk_wo_vendor"
		}),
	foreignKey({
			columns: [table.pm_schedule_id],
			foreignColumns: [pm_scheduleInInfra.pm_schedule_id],
			name: "work_order_pm_schedule_id_fkey"
		}),
	foreignKey({
			columns: [table.technician_id],
			foreignColumns: [technicianInInfra.technician_id],
			name: "work_order_technician_id_fkey"
		}),
	foreignKey({
			columns: [table.ticket_id],
			foreignColumns: [maintenance_ticketInInfra.ticket_id],
			name: "work_order_ticket_id_fkey"
		}),
	check("work_order_check", sql`(ticket_id IS NOT NULL) OR (pm_schedule_id IS NOT NULL)`),
]);

export const work_order_partInInfra = infra.table("work_order_part", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	wo_part_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.work_order_part_wo_part_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	work_order_id: bigint({ mode: "number" }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	quantity_used: numeric({ precision: 14, scale:  3 }).notNull(),
	unit_cost: numeric({ precision: 12, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "fk_wopart_sku"
		}),
	foreignKey({
			columns: [table.work_order_id],
			foreignColumns: [work_orderInInfra.work_order_id],
			name: "work_order_part_work_order_id_fkey"
		}),
]);

export const amc_contractInInfra = infra.table("amc_contract", {
	amc_id: varchar({ length: 30 }).primaryKey().notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	asset_category: asset_categoryInInfra(),
	asset_id: varchar({ length: 40 }),
	start_date: date().notNull(),
	end_date: date().notNull(),
	annual_cost: numeric({ precision: 12, scale:  2 }),
	visits_per_year: smallint(),
	status: amc_statusInInfra().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "amc_contract_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "fk_amc_vendor"
		}),
]);

export const utility_consumptionInInfra = infra.table("utility_consumption", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	utility_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "infra.utility_consumption_utility_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	facility_id: varchar({ length: 30 }).notNull(),
	utility_type: utility_typeInInfra().notNull(),
	meter_no: varchar({ length: 40 }),
	reading_date: date().notNull(),
	units_consumed: numeric({ precision: 14, scale:  3 }),
	cost: numeric({ precision: 12, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "utility_consumption_facility_id_fkey"
		}),
]);

export const app_userInPortal = portal.table("app_user", {
	user_id: integer().primaryKey().generatedByDefaultAsIdentity({ name: "portal.app_user_user_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	staff_id: varchar({ length: 20 }),
	full_name: varchar({ length: 160 }).notNull(),
	email: varchar({ length: 120 }),
	title: varchar({ length: 80 }),
	home_dept: varchar({ length: 20 }),
	idp_subject: varchar({ length: 120 }),
	active: boolean().default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.home_dept],
			foreignColumns: [departmentInRef.dept_code],
			name: "app_user_home_dept_fkey"
		}),
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "app_user_staff_id_fkey"
		}),
	unique("app_user_email_key").on(table.email),
	unique("app_user_idp_subject_key").on(table.idp_subject),
]);

export const categoryInPortal = portal.table("category", {
	category_code: varchar({ length: 10 }).primaryKey().notNull(),
	name: varchar({ length: 80 }).notNull(),
	parent_category_code: varchar({ length: 10 }),
	item_nature: item_natureInPortal(),
	is_capitalised: boolean().default(false).notNull(),
	default_gl_account_id: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.parent_category_code],
			foreignColumns: [table.category_code],
			name: "category_parent_category_code_fkey"
		}),
	foreignKey({
			columns: [table.default_gl_account_id],
			foreignColumns: [gl_accountInPortal.gl_account_id],
			name: "fk_category_gl"
		}),
]);

export const sub_categoryInPortal = portal.table("sub_category", {
	sub_category_id: integer().primaryKey().notNull(),
	category_code: varchar({ length: 10 }).notNull(),
	name: varchar({ length: 80 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.category_code],
			foreignColumns: [categoryInPortal.category_code],
			name: "sub_category_category_code_fkey"
		}),
	unique("sub_category_category_code_name_key").on(table.category_code, table.name),
]);

export const stock_groupInPortal = portal.table("stock_group", {
	group_code: varchar({ length: 10 }).primaryKey().notNull(),
	name: varchar({ length: 80 }).notNull(),
	parent_group_code: varchar({ length: 10 }),
}, (table) => [
	foreignKey({
			columns: [table.parent_group_code],
			foreignColumns: [table.group_code],
			name: "stock_group_parent_group_code_fkey"
		}),
]);

export const unit_of_measureInPortal = portal.table("unit_of_measure", {
	uom: varchar({ length: 10 }).primaryKey().notNull(),
	formal_name: varchar({ length: 40 }).notNull(),
	uqc: varchar({ length: 20 }),
	decimal_places: smallint().default(0).notNull(),
	conversion_to_base: numeric({ precision: 12, scale:  4 }),
	base_uom: varchar({ length: 10 }),
}, (table) => [
	foreignKey({
			columns: [table.base_uom],
			foreignColumns: [table.uom],
			name: "unit_of_measure_base_uom_fkey"
		}),
]);

export const gl_accountInPortal = portal.table("gl_account", {
	gl_account_id: varchar({ length: 20 }).primaryKey().notNull(),
	account_code: varchar({ length: 20 }).notNull(),
	account_name: varchar({ length: 120 }).notNull(),
	account_type: gl_account_typeInPortal().notNull(),
	parent_account_id: varchar({ length: 20 }),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.parent_account_id],
			foreignColumns: [table.gl_account_id],
			name: "gl_account_parent_account_id_fkey"
		}),
	unique("gl_account_account_code_key").on(table.account_code),
]);

export const ledgerInPortal = portal.table("ledger", {
	ledger_code: varchar({ length: 20 }).primaryKey().notNull(),
	name: varchar({ length: 80 }).notNull(),
	ledger_group: ledger_groupInPortal().notNull(),
	gl_account_id: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.gl_account_id],
			foreignColumns: [gl_accountInPortal.gl_account_id],
			name: "ledger_gl_account_id_fkey"
		}),
]);

export const vendorInPortal = portal.table("vendor", {
	vendor_id: varchar({ length: 20 }).primaryKey().notNull(),
	name: varchar({ length: 160 }).notNull(),
	vendor_type: vendor_typeInPortal(),
	city: varchar({ length: 80 }),
	address: text(),
	contact_person: varchar({ length: 120 }),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 120 }),
	gstin: varchar({ length: 15 }),
	pan_no: varchar({ length: 10 }),
	bank_account_no: varchar({ length: 30 }),
	ifsc_code: varchar({ length: 11 }),
	payment_terms_days: smallint(),
	msme_registered: boolean().default(false).notNull(),
	blacklist_flag: boolean().default(false).notNull(),
	on_time_pct: numeric({ precision: 5, scale:  2 }),
	quality_score: numeric({ precision: 3, scale:  1 }),
	lead_days: smallint(),
	overall_rating: numeric({ precision: 3, scale:  2 }),
	service_type: varchar({ length: 80 }),
	status: vendor_statusInPortal().default('Active').notNull(),
});

export const materialInPortal = portal.table("material", {
	sku: varchar({ length: 30 }).primaryKey().notNull(),
	erp_material_code: varchar({ length: 20 }),
	name: varchar({ length: 160 }).notNull(),
	part_no: varchar({ length: 60 }),
	description: text(),
	notes: text(),
	category_code: varchar({ length: 10 }),
	sub_category_id: integer(),
	stock_group_code: varchar({ length: 10 }),
	base_unit: varchar({ length: 10 }).notNull(),
	alt_unit: varchar({ length: 10 }),
	conversion_factor: numeric({ precision: 12, scale:  4 }),
	hsn_sac_code: varchar({ length: 10 }),
	gst_applicable: boolean().default(true).notNull(),
	item_nature: item_natureInPortal().default('Consumable').notNull(),
	purchase_ledger_code: varchar({ length: 20 }),
	sales_ledger_code: varchar({ length: 20 }),
	cost_tracking: boolean().default(false).notNull(),
	costing_method: valuation_methodInPortal().default('Weighted_Average').notNull(),
	market_valuation_method: valuation_methodInPortal(),
	maintain_batches: boolean().default(false).notNull(),
	track_mfg_date: boolean().default(false).notNull(),
	use_expiry: boolean().default(false).notNull(),
	shelf_life_days: integer(),
	list_price: numeric({ precision: 14, scale:  2 }),
	standard_cost: numeric({ precision: 14, scale:  2 }),
	reorder_level: numeric({ precision: 14, scale:  3 }),
	min_order_qty: numeric({ precision: 14, scale:  3 }),
	reorder_qty: numeric({ precision: 14, scale:  3 }),
	consumption_period_days: integer(),
	reorder_criteria: varchar({ length: 10 }),
	lead_time_days: integer(),
	brand: varchar({ length: 80 }),
	model_no: varchar({ length: 80 }),
	barcode_qr: varchar({ length: 80 }),
	preferred_supplier_code: varchar({ length: 20 }),
	custodian_dept_code: varchar({ length: 20 }),
	warranty_months: integer(),
	requires_installation: boolean().default(false).notNull(),
	requires_inspection: boolean().default(false).notNull(),
	is_serialised: boolean().default(false).notNull(),
	substitute_sku: varchar({ length: 30 }),
	status: material_statusInPortal().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.alt_unit],
			foreignColumns: [unit_of_measureInPortal.uom],
			name: "material_alt_unit_fkey"
		}),
	foreignKey({
			columns: [table.base_unit],
			foreignColumns: [unit_of_measureInPortal.uom],
			name: "material_base_unit_fkey"
		}),
	foreignKey({
			columns: [table.category_code],
			foreignColumns: [categoryInPortal.category_code],
			name: "material_category_code_fkey"
		}),
	foreignKey({
			columns: [table.custodian_dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "material_custodian_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.hsn_sac_code],
			foreignColumns: [hsn_sacInPortal.hsn_sac_code],
			name: "material_hsn_sac_code_fkey"
		}),
	foreignKey({
			columns: [table.preferred_supplier_code],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "material_preferred_supplier_code_fkey"
		}),
	foreignKey({
			columns: [table.purchase_ledger_code],
			foreignColumns: [ledgerInPortal.ledger_code],
			name: "material_purchase_ledger_code_fkey"
		}),
	foreignKey({
			columns: [table.sales_ledger_code],
			foreignColumns: [ledgerInPortal.ledger_code],
			name: "material_sales_ledger_code_fkey"
		}),
	foreignKey({
			columns: [table.stock_group_code],
			foreignColumns: [stock_groupInPortal.group_code],
			name: "material_stock_group_code_fkey"
		}),
	foreignKey({
			columns: [table.sub_category_id],
			foreignColumns: [sub_categoryInPortal.sub_category_id],
			name: "material_sub_category_id_fkey"
		}),
	foreignKey({
			columns: [table.substitute_sku],
			foreignColumns: [table.sku],
			name: "material_substitute_sku_fkey"
		}),
	unique("material_erp_material_code_key").on(table.erp_material_code),
]);

export const hsn_sacInPortal = portal.table("hsn_sac", {
	hsn_sac_code: varchar({ length: 10 }).primaryKey().notNull(),
	description: varchar({ length: 160 }),
	taxability: taxabilityInPortal().default('Taxable').notNull(),
	gst_rate: numeric({ precision: 5, scale:  2 }).notNull(),
});

export const batchInPortal = portal.table("batch", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batch_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.batch_batch_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	sku: varchar({ length: 30 }).notNull(),
	batch_no: varchar({ length: 40 }).notNull(),
	mfg_date: date(),
	expiry_date: date(),
}, (table) => [
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "batch_sku_fkey"
		}),
	unique("batch_sku_batch_no_key").on(table.batch_no, table.sku),
]);

export const locationInPortal = portal.table("location", {
	location_code: varchar({ length: 10 }).primaryKey().notNull(),
	name: varchar({ length: 120 }).notNull(),
	campus_id: varchar({ length: 20 }),
	store_type: store_typeInPortal().default('Central').notNull(),
	parent_location_code: varchar({ length: 10 }),
	dept_code: varchar({ length: 20 }),
	facility_id: varchar({ length: 30 }),
	space_id: varchar({ length: 30 }),
	store_keeper_id: varchar({ length: 20 }),
	can_purchase_directly: boolean().default(false).notNull(),
	max_stock_value: numeric({ precision: 14, scale:  2 }),
	distance_km: numeric({ precision: 8, scale:  2 }),
	status: store_statusInPortal().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.campus_id],
			foreignColumns: [campusInInfra.campus_id],
			name: "location_campus_id_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "location_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "location_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.parent_location_code],
			foreignColumns: [table.location_code],
			name: "location_parent_location_code_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "location_space_id_fkey"
		}),
	foreignKey({
			columns: [table.store_keeper_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "location_store_keeper_id_fkey"
		}),
]);

export const binInPortal = portal.table("bin", {
	bin_code: varchar({ length: 20 }).primaryKey().notNull(),
	location_code: varchar({ length: 10 }).notNull(),
	rack_no: varchar({ length: 10 }),
	shelf_no: varchar({ length: 10 }),
	capacity: numeric({ precision: 12, scale:  2 }),
	storage_condition: storage_conditionInPortal().default('Normal').notNull(),
	status: bin_statusInPortal().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.location_code],
			foreignColumns: [locationInPortal.location_code],
			name: "bin_location_code_fkey"
		}),
]);

export const serialised_stockInPortal = portal.table("serialised_stock", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	serial_stock_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.serialised_stock_serial_stock_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	sku: varchar({ length: 30 }).notNull(),
	serial_no: varchar({ length: 80 }).notNull(),
	location_code: varchar({ length: 10 }),
	grn_id: varchar({ length: 20 }),
	asset_id: varchar({ length: 40 }),
	status: serial_statusInPortal().default('In_Store').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "fk_serial_grn"
		}),
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "serialised_stock_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.location_code],
			foreignColumns: [locationInPortal.location_code],
			name: "serialised_stock_location_code_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "serialised_stock_sku_fkey"
		}),
	unique("serialised_stock_sku_serial_no_key").on(table.serial_no, table.sku),
]);

export const vendor_itemInPortal = portal.table("vendor_item", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vendor_item_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.vendor_item_vendor_item_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	vendor_id: varchar({ length: 20 }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	vendor_item_code: varchar({ length: 60 }),
	last_quoted_price: numeric({ precision: 14, scale:  2 }),
	last_purchase_date: date(),
	min_order_qty: numeric({ precision: 14, scale:  3 }),
	lead_time_days: integer(),
	is_preferred: boolean().default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "vendor_item_sku_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "vendor_item_vendor_id_fkey"
		}),
	unique("vendor_item_vendor_id_sku_key").on(table.sku, table.vendor_id),
]);

export const transporterInPortal = portal.table("transporter", {
	transporter_id: varchar({ length: 20 }).primaryKey().notNull(),
	transporter_name: varchar({ length: 120 }).notNull(),
	vendor_id: varchar({ length: 20 }),
	contact: varchar({ length: 120 }),
	transport_mode: transport_modeInPortal(),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "transporter_vendor_id_fkey"
		}),
]);

export const tax_masterInPortal = portal.table("tax_master", {
	tax_id: varchar({ length: 20 }).primaryKey().notNull(),
	tax_name: varchar({ length: 60 }).notNull(),
	tax_type: tax_typeInPortal().notNull(),
	rate_pct: numeric({ precision: 5, scale:  2 }).notNull(),
	cgst_pct: numeric({ precision: 5, scale:  2 }),
	sgst_pct: numeric({ precision: 5, scale:  2 }),
	igst_pct: numeric({ precision: 5, scale:  2 }),
	effective_from: date().notNull(),
	effective_to: date(),
	gl_account_id: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.gl_account_id],
			foreignColumns: [gl_accountInPortal.gl_account_id],
			name: "tax_master_gl_account_id_fkey"
		}),
]);

export const budget_headInPortal = portal.table("budget_head", {
	budget_code: varchar({ length: 30 }).primaryKey().notNull(),
	dept_code: varchar({ length: 20 }).notNull(),
	fy: varchar({ length: 9 }).notNull(),
	budget_category: budget_categoryInPortal(),
	head_name: varchar({ length: 120 }),
	gl_account_id: varchar({ length: 20 }),
	allocated: numeric({ precision: 16, scale:  2 }).notNull(),
	committed_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	utilised_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	balance_amount: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`((allocated - committed_amount) - utilised_amount)`),
	status: budget_statusInPortal().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "budget_head_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.gl_account_id],
			foreignColumns: [gl_accountInPortal.gl_account_id],
			name: "budget_head_gl_account_id_fkey"
		}),
	unique("budget_head_dept_code_fy_budget_category_key").on(table.budget_category, table.dept_code, table.fy),
]);

export const reorder_ruleInPortal = portal.table("reorder_rule", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	reorder_rule_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.reorder_rule_reorder_rule_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	location_code: varchar({ length: 10 }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	min_level: numeric({ precision: 14, scale:  3 }).notNull(),
	max_level: numeric({ precision: 14, scale:  3 }),
	reorder_qty: numeric({ precision: 14, scale:  3 }).notNull(),
	replenish_from: replenish_fromInPortal().notNull(),
	auto_generate: boolean().default(false).notNull(),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.location_code],
			foreignColumns: [locationInPortal.location_code],
			name: "reorder_rule_location_code_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "reorder_rule_sku_fkey"
		}),
	unique("reorder_rule_location_code_sku_key").on(table.location_code, table.sku),
]);

export const approval_authority_matrixInPortal = portal.table("approval_authority_matrix", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	matrix_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.approval_authority_matrix_matrix_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	document_type: matrix_doc_typeInPortal().notNull(),
	value_from: numeric({ precision: 16, scale:  2 }).notNull(),
	value_to: numeric({ precision: 16, scale:  2 }),
	level_1_role: varchar({ length: 30 }),
	level_2_role: varchar({ length: 30 }),
	level_3_role: varchar({ length: 30 }),
	requires_committee: boolean().default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.level_1_role],
			foreignColumns: [roleInPortal.role_code],
			name: "approval_authority_matrix_level_1_role_fkey"
		}),
	foreignKey({
			columns: [table.level_2_role],
			foreignColumns: [roleInPortal.role_code],
			name: "approval_authority_matrix_level_2_role_fkey"
		}),
	foreignKey({
			columns: [table.level_3_role],
			foreignColumns: [roleInPortal.role_code],
			name: "approval_authority_matrix_level_3_role_fkey"
		}),
]);

export const stock_movementInPortal = portal.table("stock_movement", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	movement_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.stock_movement_movement_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	moved_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	sku: varchar({ length: 30 }).notNull(),
	bin_code: varchar({ length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batch_id: bigint({ mode: "number" }),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
	unit_cost: numeric({ precision: 14, scale:  2 }),
	movement_type: movement_typeInPortal().notNull(),
	actor_id: integer(),
	grn_id: varchar({ length: 20 }),
	issue_id: varchar({ length: 20 }),
	receipt_id: varchar({ length: 20 }),
	stock_entry_id: varchar({ length: 20 }),
	deployment_id: varchar({ length: 20 }),
	srn_id: varchar({ length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	transfer_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	return_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	adjustment_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rtv_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	count_id: bigint({ mode: "number" }),
	balance_after: numeric({ precision: 14, scale:  3 }),
	remarks: text(),
}, (table) => [
	index("ix_stock_movement_sku_bin").using("btree", table.sku.asc().nullsLast().op("timestamptz_ops"), table.bin_code.asc().nullsLast().op("text_ops"), table.moved_at.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.adjustment_id],
			foreignColumns: [stock_adjustmentInPortal.adjustment_id],
			name: "fk_mv_adj"
		}),
	foreignKey({
			columns: [table.count_id],
			foreignColumns: [physical_countInPortal.count_id],
			name: "fk_mv_count"
		}),
	foreignKey({
			columns: [table.deployment_id],
			foreignColumns: [deploymentInPortal.deployment_id],
			name: "fk_mv_deployment"
		}),
	foreignKey({
			columns: [table.stock_entry_id],
			foreignColumns: [stock_entryInPortal.entry_id],
			name: "fk_mv_entry"
		}),
	foreignKey({
			columns: [table.grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "fk_mv_grn"
		}),
	foreignKey({
			columns: [table.issue_id],
			foreignColumns: [material_issueInPortal.issue_id],
			name: "fk_mv_issue"
		}),
	foreignKey({
			columns: [table.receipt_id],
			foreignColumns: [receiptInPortal.receipt_id],
			name: "fk_mv_receipt"
		}),
	foreignKey({
			columns: [table.return_id],
			foreignColumns: [stock_returnInPortal.return_id],
			name: "fk_mv_return"
		}),
	foreignKey({
			columns: [table.rtv_id],
			foreignColumns: [return_to_vendorInPortal.rtv_id],
			name: "fk_mv_rtv"
		}),
	foreignKey({
			columns: [table.srn_id],
			foreignColumns: [scrap_returnInPortal.srn_id],
			name: "fk_mv_srn"
		}),
	foreignKey({
			columns: [table.transfer_id],
			foreignColumns: [stock_transferInPortal.transfer_id],
			name: "fk_mv_transfer"
		}),
	foreignKey({
			columns: [table.actor_id],
			foreignColumns: [app_userInPortal.user_id],
			name: "stock_movement_actor_id_fkey"
		}),
	foreignKey({
			columns: [table.batch_id],
			foreignColumns: [batchInPortal.batch_id],
			name: "stock_movement_batch_id_fkey"
		}),
	foreignKey({
			columns: [table.bin_code],
			foreignColumns: [binInPortal.bin_code],
			name: "stock_movement_bin_code_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "stock_movement_sku_fkey"
		}),
]);

export const indentInPortal = portal.table("indent", {
	indent_id: varchar({ length: 20 }).primaryKey().notNull(),
	dept_code: varchar({ length: 20 }).notNull(),
	raised_by: integer().notNull(),
	raised_on: date().default(sql`CURRENT_DATE`).notNull(),
	need_by: date(),
	purpose: text(),
	priority: indent_priorityInPortal().default('Normal').notNull(),
	budget_code: varchar({ length: 30 }),
	workflow_step: smallint().default(0).notNull(),
	target_space_id: varchar({ length: 30 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	work_order_id: bigint({ mode: "number" }),
	preferred_location: varchar({ length: 10 }),
	hod_approval_by: varchar({ length: 20 }),
	hod_approval_date: date(),
	status: indent_statusInPortal().default('Draft').notNull(),
	facility_id: varchar({ length: 30 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	ticket_id: bigint({ mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.budget_code],
			foreignColumns: [budget_headInPortal.budget_code],
			name: "indent_budget_code_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "indent_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "indent_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.hod_approval_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "indent_hod_approval_by_fkey"
		}),
	foreignKey({
			columns: [table.preferred_location],
			foreignColumns: [locationInPortal.location_code],
			name: "indent_preferred_location_fkey"
		}),
	foreignKey({
			columns: [table.raised_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "indent_raised_by_fkey"
		}),
	foreignKey({
			columns: [table.target_space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "indent_target_space_id_fkey"
		}),
	foreignKey({
			columns: [table.ticket_id],
			foreignColumns: [maintenance_ticketInInfra.ticket_id],
			name: "indent_ticket_id_fkey"
		}),
	foreignKey({
			columns: [table.work_order_id],
			foreignColumns: [work_orderInInfra.work_order_id],
			name: "indent_work_order_id_fkey"
		}),
	foreignKey({
			columns: [table.workflow_step],
			foreignColumns: [indent_stepInPortal.step],
			name: "indent_workflow_step_fkey"
		}),
]);

export const indent_stepInPortal = portal.table("indent_step", {
	step: smallint().primaryKey().notNull(),
	name: varchar({ length: 80 }).notNull(),
});

export const po_counterInPortal = portal.table("po_counter", {
	fy: varchar({ length: 9 }).primaryKey().notNull(),
	last_seq: integer().default(0).notNull(),
});

export const stock_transferInPortal = portal.table("stock_transfer", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	transfer_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.stock_transfer_transfer_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	transfer_no: varchar({ length: 20 }).notNull(),
	from_location: varchar({ length: 10 }).notNull(),
	to_location: varchar({ length: 10 }).notNull(),
	transfer_type: transfer_typeInPortal().notNull(),
	indent_id: varchar({ length: 20 }),
	requested_by: varchar({ length: 20 }),
	approved_by: varchar({ length: 20 }),
	request_date: date().default(sql`CURRENT_DATE`).notNull(),
	dispatch_date: date(),
	receipt_date: date(),
	status: transfer_statusInPortal().default('Requested').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "stock_transfer_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.from_location],
			foreignColumns: [locationInPortal.location_code],
			name: "stock_transfer_from_location_fkey"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "stock_transfer_indent_id_fkey"
		}),
	foreignKey({
			columns: [table.requested_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "stock_transfer_requested_by_fkey"
		}),
	foreignKey({
			columns: [table.to_location],
			foreignColumns: [locationInPortal.location_code],
			name: "stock_transfer_to_location_fkey"
		}),
	unique("stock_transfer_transfer_no_key").on(table.transfer_no),
	check("stock_transfer_check", sql`(from_location)::text <> (to_location)::text`),
]);

export const stock_checkInPortal = portal.table("stock_check", {
	indent_id: varchar({ length: 20 }).primaryKey().notNull(),
	checked_by: integer(),
	checked_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	note: text(),
}, (table) => [
	foreignKey({
			columns: [table.checked_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "stock_check_checked_by_fkey"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "stock_check_indent_id_fkey"
		}),
]);

export const scrap_returnInPortal = portal.table("scrap_return", {
	srn_id: varchar({ length: 20 }).primaryKey().notNull(),
	indent_id: varchar({ length: 20 }),
	sku: varchar({ length: 30 }),
	old_serial: varchar({ length: 80 }),
	asset_id: varchar({ length: 40 }),
	received_by: integer(),
	received_on: date(),
	status: scrap_statusInPortal().default('Pending').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "scrap_return_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "scrap_return_indent_id_fkey"
		}),
	foreignKey({
			columns: [table.received_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "scrap_return_received_by_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "scrap_return_sku_fkey"
		}),
]);

export const material_issueInPortal = portal.table("material_issue", {
	issue_id: varchar({ length: 20 }).primaryKey().notNull(),
	indent_id: varchar({ length: 20 }).notNull(),
	location_code: varchar({ length: 10 }),
	dept_code: varchar({ length: 20 }),
	issued_on: date().default(sql`CURRENT_DATE`).notNull(),
	issued_by: integer(),
	collected_by: integer(),
	delivered_to_space_id: varchar({ length: 30 }),
	method: issue_methodInPortal(),
	acknowledged_by: varchar({ length: 20 }),
	acknowledged_on: date(),
	status: issue_statusInPortal().default('Awaiting_Collection').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hostel_alloc_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	ticket_id: bigint({ mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.hostel_alloc_id],
			foreignColumns: [hostel_allocationInHostel.hostel_alloc_id],
			name: "fk_issue_alloc"
		}),
	foreignKey({
			columns: [table.acknowledged_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "material_issue_acknowledged_by_fkey"
		}),
	foreignKey({
			columns: [table.collected_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "material_issue_collected_by_fkey"
		}),
	foreignKey({
			columns: [table.delivered_to_space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "material_issue_delivered_to_space_id_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "material_issue_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "material_issue_indent_id_fkey"
		}),
	foreignKey({
			columns: [table.issued_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "material_issue_issued_by_fkey"
		}),
	foreignKey({
			columns: [table.location_code],
			foreignColumns: [locationInPortal.location_code],
			name: "material_issue_location_code_fkey"
		}),
	foreignKey({
			columns: [table.ticket_id],
			foreignColumns: [maintenance_ticketInInfra.ticket_id],
			name: "material_issue_ticket_id_fkey"
		}),
]);

export const dept_consumptionInPortal = portal.table("dept_consumption", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	consumption_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.dept_consumption_consumption_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	dept_code: varchar({ length: 20 }).notNull(),
	space_id: varchar({ length: 30 }),
	sku: varchar({ length: 30 }).notNull(),
	issue_id: varchar({ length: 20 }),
	qty_received: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_consumed: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_returned: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_in_hand: numeric({ precision: 14, scale:  3 }).generatedAlwaysAs(sql`((qty_received - qty_consumed) - qty_returned)`),
	custodian_id: varchar({ length: 20 }),
	period: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.custodian_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "dept_consumption_custodian_id_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "dept_consumption_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.issue_id],
			foreignColumns: [material_issueInPortal.issue_id],
			name: "dept_consumption_issue_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "dept_consumption_sku_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "dept_consumption_space_id_fkey"
		}),
]);

export const receiptInPortal = portal.table("receipt", {
	receipt_id: varchar({ length: 20 }).primaryKey().notNull(),
	sku: varchar({ length: 30 }).notNull(),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
	unit_price: numeric({ precision: 14, scale:  2 }),
	bin_code: varchar({ length: 20 }).notNull(),
	reference: varchar({ length: 160 }),
	owner_id: integer(),
	verified_by: integer(),
	received_on: date().default(sql`CURRENT_DATE`).notNull(),
	status: receipt_statusInPortal().default('Draft').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bin_code],
			foreignColumns: [binInPortal.bin_code],
			name: "receipt_bin_code_fkey"
		}),
	foreignKey({
			columns: [table.owner_id],
			foreignColumns: [app_userInPortal.user_id],
			name: "receipt_owner_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "receipt_sku_fkey"
		}),
	foreignKey({
			columns: [table.verified_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "receipt_verified_by_fkey"
		}),
]);

export const stock_entryInPortal = portal.table("stock_entry", {
	entry_id: varchar({ length: 20 }).primaryKey().notNull(),
	entry_on: date().default(sql`CURRENT_DATE`).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	bin_code: varchar({ length: 20 }).notNull(),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
	unit_price: numeric({ precision: 14, scale:  2 }),
	actor_id: integer(),
	matched_po_id: integer(),
	matched_indent_id: varchar({ length: 20 }),
	audit_status: audit_statusInPortal().default('Clear').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.matched_po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "fk_stock_entry_po"
		}),
	foreignKey({
			columns: [table.actor_id],
			foreignColumns: [app_userInPortal.user_id],
			name: "stock_entry_actor_id_fkey"
		}),
	foreignKey({
			columns: [table.bin_code],
			foreignColumns: [binInPortal.bin_code],
			name: "stock_entry_bin_code_fkey"
		}),
	foreignKey({
			columns: [table.matched_indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "stock_entry_matched_indent_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "stock_entry_sku_fkey"
		}),
]);

export const stock_returnInPortal = portal.table("stock_return", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	return_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.stock_return_return_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	return_no: varchar({ length: 20 }).notNull(),
	from_dept: varchar({ length: 20 }).notNull(),
	from_space_id: varchar({ length: 30 }),
	to_location: varchar({ length: 10 }).notNull(),
	issue_id: varchar({ length: 20 }),
	return_reason: return_reasonInPortal().notNull(),
	returned_by: varchar({ length: 20 }),
	received_by: varchar({ length: 20 }),
	return_date: date().default(sql`CURRENT_DATE`).notNull(),
	condition: return_conditionInPortal().notNull(),
	status: return_statusInPortal().default('Raised').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.from_dept],
			foreignColumns: [departmentInRef.dept_code],
			name: "stock_return_from_dept_fkey"
		}),
	foreignKey({
			columns: [table.from_space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "stock_return_from_space_id_fkey"
		}),
	foreignKey({
			columns: [table.issue_id],
			foreignColumns: [material_issueInPortal.issue_id],
			name: "stock_return_issue_id_fkey"
		}),
	foreignKey({
			columns: [table.received_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "stock_return_received_by_fkey"
		}),
	foreignKey({
			columns: [table.returned_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "stock_return_returned_by_fkey"
		}),
	foreignKey({
			columns: [table.to_location],
			foreignColumns: [locationInPortal.location_code],
			name: "stock_return_to_location_fkey"
		}),
	unique("stock_return_return_no_key").on(table.return_no),
]);

export const stock_transfer_lineInPortal = portal.table("stock_transfer_line", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	transfer_line_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.stock_transfer_line_transfer_line_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	transfer_id: bigint({ mode: "number" }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batch_id: bigint({ mode: "number" }),
	qty_requested: numeric({ precision: 14, scale:  3 }).notNull(),
	qty_dispatched: numeric({ precision: 14, scale:  3 }),
	qty_received: numeric({ precision: 14, scale:  3 }),
	discrepancy_qty: numeric({ precision: 14, scale:  3 }).generatedAlwaysAs(sql`(COALESCE(qty_dispatched, (0)::numeric) - COALESCE(qty_received, (0)::numeric))`),
	remarks: text(),
}, (table) => [
	foreignKey({
			columns: [table.batch_id],
			foreignColumns: [batchInPortal.batch_id],
			name: "stock_transfer_line_batch_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "stock_transfer_line_sku_fkey"
		}),
	foreignKey({
			columns: [table.transfer_id],
			foreignColumns: [stock_transferInPortal.transfer_id],
			name: "stock_transfer_line_transfer_id_fkey"
		}).onDelete("cascade"),
]);

export const stock_adjustmentInPortal = portal.table("stock_adjustment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	adjustment_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.stock_adjustment_adjustment_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	location_code: varchar({ length: 10 }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	bin_code: varchar({ length: 20 }),
	adjustment_type: adjustment_typeInPortal().notNull(),
	qty_adjusted: numeric({ precision: 14, scale:  3 }).notNull(),
	value_adjusted: numeric({ precision: 16, scale:  2 }),
	reason: text().notNull(),
	requested_by: varchar({ length: 20 }),
	approved_by: varchar({ length: 20 }),
	adjustment_date: date().default(sql`CURRENT_DATE`).notNull(),
	status: approval_statusInPortal().default('Pending').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "stock_adjustment_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.bin_code],
			foreignColumns: [binInPortal.bin_code],
			name: "stock_adjustment_bin_code_fkey"
		}),
	foreignKey({
			columns: [table.location_code],
			foreignColumns: [locationInPortal.location_code],
			name: "stock_adjustment_location_code_fkey"
		}),
	foreignKey({
			columns: [table.requested_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "stock_adjustment_requested_by_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "stock_adjustment_sku_fkey"
		}),
]);

export const physical_countInPortal = portal.table("physical_count", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	count_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.physical_count_count_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	location_code: varchar({ length: 10 }).notNull(),
	count_type: count_typeInPortal().notNull(),
	count_date: date().notNull(),
	counted_by: varchar({ length: 20 }),
	verified_by: varchar({ length: 20 }),
	status: count_statusInPortal().default('Planned').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.counted_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "physical_count_counted_by_fkey"
		}),
	foreignKey({
			columns: [table.location_code],
			foreignColumns: [locationInPortal.location_code],
			name: "physical_count_location_code_fkey"
		}),
	foreignKey({
			columns: [table.verified_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "physical_count_verified_by_fkey"
		}),
]);

export const physical_count_lineInPortal = portal.table("physical_count_line", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	count_line_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.physical_count_line_count_line_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	count_id: bigint({ mode: "number" }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	bin_code: varchar({ length: 20 }).notNull(),
	system_qty: numeric({ precision: 14, scale:  3 }).notNull(),
	counted_qty: numeric({ precision: 14, scale:  3 }).notNull(),
	variance_qty: numeric({ precision: 14, scale:  3 }).generatedAlwaysAs(sql`(counted_qty - system_qty)`),
	variance_value: numeric({ precision: 16, scale:  2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	adjustment_id: bigint({ mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.adjustment_id],
			foreignColumns: [stock_adjustmentInPortal.adjustment_id],
			name: "physical_count_line_adjustment_id_fkey"
		}),
	foreignKey({
			columns: [table.bin_code],
			foreignColumns: [binInPortal.bin_code],
			name: "physical_count_line_bin_code_fkey"
		}),
	foreignKey({
			columns: [table.count_id],
			foreignColumns: [physical_countInPortal.count_id],
			name: "physical_count_line_count_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "physical_count_line_sku_fkey"
		}),
]);

export const stock_sheetInPortal = portal.table("stock_sheet", {
	sheet_id: integer().primaryKey().notNull(),
	sheet_name: varchar({ length: 80 }).notNull(),
	source_file: varchar({ length: 120 }).notNull(),
	sheet_order: smallint().notNull(),
	counted_on: date(),
});

export const new_requestInPortal = portal.table("new_request", {
	request_id: varchar({ length: 20 }).primaryKey().notNull(),
	dept_code: varchar({ length: 20 }).notNull(),
	raised_by: integer().notNull(),
	raised_on: date().default(sql`CURRENT_DATE`).notNull(),
	product: varchar({ length: 160 }).notNull(),
	brand: varchar({ length: 80 }),
	specification: text(),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
	uom: varchar({ length: 10 }),
	estimated_price: numeric({ precision: 14, scale:  2 }),
	category_code: varchar({ length: 10 }),
	indent_id: varchar({ length: 20 }),
	step: smallint().default(1).notNull(),
	registered_sku: varchar({ length: 30 }),
	status: new_request_statusInPortal().default('Submitted').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.category_code],
			foreignColumns: [categoryInPortal.category_code],
			name: "new_request_category_code_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "new_request_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "new_request_indent_id_fkey"
		}),
	foreignKey({
			columns: [table.raised_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "new_request_raised_by_fkey"
		}),
	foreignKey({
			columns: [table.registered_sku],
			foreignColumns: [materialInPortal.sku],
			name: "new_request_registered_sku_fkey"
		}),
	foreignKey({
			columns: [table.uom],
			foreignColumns: [unit_of_measureInPortal.uom],
			name: "new_request_uom_fkey"
		}),
]);

export const pr_lineInPortal = portal.table("pr_line", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pr_line_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.pr_line_pr_line_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pr_id: bigint({ mode: "number" }).notNull(),
	indent_id: varchar({ length: 20 }),
	indent_line_no: smallint(),
	sku: varchar({ length: 30 }),
	specification: text(),
	uom: varchar({ length: 10 }),
	qty_required: numeric({ precision: 14, scale:  3 }).notNull(),
	estimated_unit_price: numeric({ precision: 14, scale:  2 }),
	estimated_total: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`(qty_required * COALESCE(estimated_unit_price, (0)::numeric))`),
	delivery_location: varchar({ length: 10 }),
	install_space_id: varchar({ length: 30 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	po_line_id: bigint({ mode: "number" }),
	line_status: pr_line_statusInPortal().default('Open').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.po_line_id],
			foreignColumns: [po_lineInPortal.po_line_id],
			name: "fk_pr_line_po"
		}),
	foreignKey({
			columns: [table.delivery_location],
			foreignColumns: [locationInPortal.location_code],
			name: "pr_line_delivery_location_fkey"
		}),
	foreignKey({
			columns: [table.indent_id, table.indent_line_no],
			foreignColumns: [indent_lineInPortal.indent_id, indent_lineInPortal.line_no],
			name: "pr_line_indent_id_indent_line_no_fkey"
		}),
	foreignKey({
			columns: [table.install_space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "pr_line_install_space_id_fkey"
		}),
	foreignKey({
			columns: [table.pr_id],
			foreignColumns: [purchase_requisitionInPortal.pr_id],
			name: "pr_line_pr_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "pr_line_sku_fkey"
		}),
	foreignKey({
			columns: [table.uom],
			foreignColumns: [unit_of_measureInPortal.uom],
			name: "pr_line_uom_fkey"
		}),
]);

export const purchase_requisitionInPortal = portal.table("purchase_requisition", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pr_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.purchase_requisition_pr_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	pr_no: varchar({ length: 20 }).notNull(),
	pr_type: pr_typeInPortal().notNull(),
	raised_by_location: varchar({ length: 10 }),
	dept_code: varchar({ length: 20 }).notNull(),
	indent_id: varchar({ length: 20 }),
	budget_code: varchar({ length: 30 }),
	estimated_value: numeric({ precision: 16, scale:  2 }),
	budget_available: numeric({ precision: 16, scale:  2 }),
	justification: text(),
	raised_date: date().default(sql`CURRENT_DATE`).notNull(),
	required_by_date: date(),
	stores_head_approval: varchar({ length: 20 }),
	finance_approval: varchar({ length: 20 }),
	principal_approval: varchar({ length: 20 }),
	status: pr_statusInPortal().default('Draft').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.budget_code],
			foreignColumns: [budget_headInPortal.budget_code],
			name: "purchase_requisition_budget_code_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "purchase_requisition_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.finance_approval],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "purchase_requisition_finance_approval_fkey"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "purchase_requisition_indent_id_fkey"
		}),
	foreignKey({
			columns: [table.principal_approval],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "purchase_requisition_principal_approval_fkey"
		}),
	foreignKey({
			columns: [table.raised_by_location],
			foreignColumns: [locationInPortal.location_code],
			name: "purchase_requisition_raised_by_location_fkey"
		}),
	foreignKey({
			columns: [table.stores_head_approval],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "purchase_requisition_stores_head_approval_fkey"
		}),
	unique("purchase_requisition_pr_no_key").on(table.pr_no),
]);

export const rfqInPortal = portal.table("rfq", {
	rfq_id: varchar({ length: 20 }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pr_id: bigint({ mode: "number" }),
	indent_id: varchar({ length: 20 }),
	sku: varchar({ length: 30 }).notNull(),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
	floated_on: date().default(sql`CURRENT_DATE`).notNull(),
	due_date: date(),
	rfq_mode: rfq_modeInPortal().default('Limited_Tender').notNull(),
	min_quotes_required: smallint().default(3).notNull(),
	criteria_set_id: varchar({ length: 20 }),
	issued_by: integer(),
	status: rfq_statusInPortal().default('Draft').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "rfq_indent_id_fkey"
		}),
	foreignKey({
			columns: [table.issued_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "rfq_issued_by_fkey"
		}),
	foreignKey({
			columns: [table.pr_id],
			foreignColumns: [purchase_requisitionInPortal.pr_id],
			name: "rfq_pr_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "rfq_sku_fkey"
		}),
]);

export const vendor_evaluationInPortal = portal.table("vendor_evaluation", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	evaluation_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.vendor_evaluation_evaluation_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	rfq_id: varchar({ length: 20 }).notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	criteria_set_id: varchar({ length: 20 }).notNull(),
	criteria_id: varchar({ length: 20 }).notNull(),
	raw_value: varchar({ length: 60 }),
	score: numeric({ precision: 5, scale:  2 }),
	weighted_score: numeric({ precision: 7, scale:  3 }),
	evaluated_by: varchar({ length: 20 }),
	evaluation_date: date(),
	remarks: text(),
}, (table) => [
	foreignKey({
			columns: [table.criteria_set_id, table.criteria_id],
			foreignColumns: [vendor_evaluation_criteriaInPortal.criteria_set_id, vendor_evaluation_criteriaInPortal.criteria_id],
			name: "vendor_evaluation_criteria_set_id_criteria_id_fkey"
		}),
	foreignKey({
			columns: [table.evaluated_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "vendor_evaluation_evaluated_by_fkey"
		}),
	foreignKey({
			columns: [table.rfq_id, table.vendor_id],
			foreignColumns: [rfq_bidInPortal.rfq_id, rfq_bidInPortal.vendor_id],
			name: "vendor_evaluation_rfq_id_vendor_id_fkey"
		}),
	unique("vendor_evaluation_rfq_id_vendor_id_criteria_set_id_criteria_key").on(table.criteria_id, table.criteria_set_id, table.rfq_id, table.vendor_id),
]);

export const vendor_rankingInPortal = portal.table("vendor_ranking", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	ranking_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.vendor_ranking_ranking_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	rfq_id: varchar({ length: 20 }).notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	total_weighted_score: numeric({ precision: 8, scale:  3 }),
	rank: smallint(),
	technically_qualified: boolean().default(false).notNull(),
	is_selected: boolean().default(false).notNull(),
	selection_reason: text(),
	committee_approval_by: varchar({ length: 20 }),
	approval_date: date(),
}, (table) => [
	foreignKey({
			columns: [table.committee_approval_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "vendor_ranking_committee_approval_by_fkey"
		}),
	foreignKey({
			columns: [table.rfq_id, table.vendor_id],
			foreignColumns: [rfq_bidInPortal.rfq_id, rfq_bidInPortal.vendor_id],
			name: "vendor_ranking_rfq_id_vendor_id_fkey"
		}),
	unique("vendor_ranking_rfq_id_vendor_id_key").on(table.rfq_id, table.vendor_id),
	check("vendor_ranking_check", sql`(NOT is_selected) OR (rank = 1) OR (selection_reason IS NOT NULL)`),
]);

export const purchase_orderInPortal = portal.table("purchase_order", {
	po_id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "portal.purchase_order_po_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	office_no: varchar({ length: 40 }).notNull(),
	po_date: date().default(sql`CURRENT_DATE`).notNull(),
	fy: varchar({ length: 9 }).notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	indent_id: varchar({ length: 20 }),
	request_id: varchar({ length: 20 }),
	rfq_id: varchar({ length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pr_id: bigint({ mode: "number" }),
	po_type: po_typeInPortal().default('Standard').notNull(),
	delivery_location: varchar({ length: 10 }),
	delivery_address: text(),
	expected_delivery_date: date(),
	advance_pct: numeric({ precision: 5, scale:  2 }),
	prepared_by: integer(),
	approved_by: varchar({ length: 20 }),
	approval_date: date(),
	vendor_acknowledged_date: date(),
	stage: po_stageInPortal().default('Draft').notNull(),
	deleted_by: integer(),
	budget_code: varchar({ length: 30 }),
	facility_id: varchar({ length: 30 }),
}, (table) => [
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "purchase_order_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.budget_code],
			foreignColumns: [budget_headInPortal.budget_code],
			name: "purchase_order_budget_code_fkey"
		}),
	foreignKey({
			columns: [table.deleted_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "purchase_order_deleted_by_fkey"
		}),
	foreignKey({
			columns: [table.delivery_location],
			foreignColumns: [locationInPortal.location_code],
			name: "purchase_order_delivery_location_fkey"
		}),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "purchase_order_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.fy],
			foreignColumns: [po_counterInPortal.fy],
			name: "purchase_order_fy_fkey"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "purchase_order_indent_id_fkey"
		}),
	foreignKey({
			columns: [table.pr_id],
			foreignColumns: [purchase_requisitionInPortal.pr_id],
			name: "purchase_order_pr_id_fkey"
		}),
	foreignKey({
			columns: [table.prepared_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "purchase_order_prepared_by_fkey"
		}),
	foreignKey({
			columns: [table.request_id],
			foreignColumns: [new_requestInPortal.request_id],
			name: "purchase_order_request_id_fkey"
		}),
	foreignKey({
			columns: [table.rfq_id],
			foreignColumns: [rfqInPortal.rfq_id],
			name: "purchase_order_rfq_id_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "purchase_order_vendor_id_fkey"
		}),
	unique("purchase_order_office_no_key").on(table.office_no),
]);

export const po_termsInPortal = portal.table("po_terms", {
	po_id: integer().primaryKey().notNull(),
	taxes: varchar({ length: 60 }),
	delivery_schedule: varchar({ length: 120 }),
	warranty: varchar({ length: 120 }),
	warranty_months: smallint(),
	jurisdiction: varchar({ length: 60 }),
	payment_terms: varchar({ length: 160 }),
	penalty_clause: text(),
	terms_conditions: text(),
}, (table) => [
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "po_terms_po_id_fkey"
		}).onDelete("cascade"),
]);

export const po_amendmentInPortal = portal.table("po_amendment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	amendment_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.po_amendment_amendment_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	po_id: integer().notNull(),
	amendment_no: smallint().notNull(),
	amendment_date: date().default(sql`CURRENT_DATE`).notNull(),
	change_type: po_change_typeInPortal().notNull(),
	old_value: text(),
	new_value: text(),
	reason: text(),
	approved_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "po_amendment_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "po_amendment_po_id_fkey"
		}),
	unique("po_amendment_po_id_amendment_no_key").on(table.amendment_no, table.po_id),
]);

export const po_conditionInPortal = portal.table("po_condition", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	condition_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.po_condition_condition_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	po_id: integer().notNull(),
	condition_text: varchar({ length: 300 }).notNull(),
	due_date: date(),
	watched_by: varchar({ length: 20 }),
	status: condition_statusInPortal().default('Open').notNull(),
	met_on: date(),
}, (table) => [
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "po_condition_po_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.watched_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "po_condition_watched_by_fkey"
		}),
]);

export const po_alertInPortal = portal.table("po_alert", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	alert_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.po_alert_alert_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	po_id: integer().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	condition_id: bigint({ mode: "number" }),
	alert_type: varchar({ length: 40 }).notNull(),
	severity: alert_severityInPortal().default('Warning').notNull(),
	raised_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	assigned_to: varchar({ length: 20 }),
	acknowledged_at: timestamp({ withTimezone: true, mode: 'string' }),
	status: alert_statusInPortal().default('Open').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.assigned_to],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "po_alert_assigned_to_fkey"
		}),
	foreignKey({
			columns: [table.condition_id],
			foreignColumns: [po_conditionInPortal.condition_id],
			name: "po_alert_condition_id_fkey"
		}),
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "po_alert_po_id_fkey"
		}),
]);

export const approval_logInPortal = portal.table("approval_log", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	approval_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.approval_log_approval_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	document_type: matrix_doc_typeInPortal().notNull(),
	document_id: varchar({ length: 40 }).notNull(),
	level: smallint().notNull(),
	approver_role: varchar({ length: 30 }),
	approver_id: varchar({ length: 20 }),
	action: approval_actionInPortal().notNull(),
	action_date: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	comments: text(),
}, (table) => [
	index("ix_approval_log_doc").using("btree", table.document_type.asc().nullsLast().op("text_ops"), table.document_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approver_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "approval_log_approver_id_fkey"
		}),
	foreignKey({
			columns: [table.approver_role],
			foreignColumns: [roleInPortal.role_code],
			name: "approval_log_approver_role_fkey"
		}),
]);

export const shipmentInPortal = portal.table("shipment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	shipment_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.shipment_shipment_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	po_id: integer().notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	transporter_id: varchar({ length: 20 }),
	dispatch_date: date(),
	lr_docket_no: varchar({ length: 60 }),
	vehicle_no: varchar({ length: 20 }),
	driver_name_contact: varchar({ length: 120 }),
	e_way_bill_no: varchar({ length: 30 }),
	no_of_packages: integer(),
	gross_weight_kg: numeric({ precision: 10, scale:  2 }),
	freight_charges: numeric({ precision: 12, scale:  2 }),
	freight_paid_by: freight_paid_byInPortal(),
	insurance_ref: varchar({ length: 60 }),
	expected_arrival_date: date(),
	actual_arrival_date: date(),
	status: shipment_statusInPortal().default('Dispatched').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "shipment_po_id_fkey"
		}),
	foreignKey({
			columns: [table.transporter_id],
			foreignColumns: [transporterInPortal.transporter_id],
			name: "shipment_transporter_id_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "shipment_vendor_id_fkey"
		}),
]);

export const shipment_trackingInPortal = portal.table("shipment_tracking", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tracking_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.shipment_tracking_tracking_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	shipment_id: bigint({ mode: "number" }).notNull(),
	event_time: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	location: varchar({ length: 120 }),
	event_status: varchar({ length: 60 }),
	updated_by: tracking_sourceInPortal().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.shipment_id],
			foreignColumns: [shipmentInPortal.shipment_id],
			name: "shipment_tracking_shipment_id_fkey"
		}).onDelete("cascade"),
]);

export const gate_entryInPortal = portal.table("gate_entry", {
	gate_entry_id: varchar({ length: 20 }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	shipment_id: bigint({ mode: "number" }),
	entry_datetime: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	vehicle_no: varchar({ length: 20 }),
	invoice_challan_no: varchar({ length: 60 }),
	no_of_packages: integer(),
	security_staff_id: varchar({ length: 20 }),
	status: gate_statusInPortal().default('Entered').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.security_staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "gate_entry_security_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.shipment_id],
			foreignColumns: [shipmentInPortal.shipment_id],
			name: "gate_entry_shipment_id_fkey"
		}),
]);

export const grnInPortal = portal.table("grn", {
	grn_id: varchar({ length: 20 }).primaryKey().notNull(),
	po_id: integer().notNull(),
	line_no: smallint().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	shipment_id: bigint({ mode: "number" }),
	gate_entry_id: varchar({ length: 20 }),
	vendor_invoice_no: varchar({ length: 60 }),
	vendor_invoice_date: date(),
	received_on: date().default(sql`CURRENT_DATE`).notNull(),
	receiving_location: varchar({ length: 10 }),
	received_by: integer(),
	bin_code: varchar({ length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batch_id: bigint({ mode: "number" }),
	serial_nos: text(),
	qty_delivered: numeric({ precision: 14, scale:  3 }),
	qty_received: numeric({ precision: 14, scale:  3 }).notNull(),
	accepted_qty: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_rejected: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_short: numeric({ precision: 14, scale:  3 }).generatedAlwaysAs(sql`(COALESCE(qty_delivered, (0)::numeric) - qty_received)`),
	unit_price: numeric({ precision: 14, scale:  2 }),
	accepted_value: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`(accepted_qty * COALESCE(unit_price, (0)::numeric))`),
	inspection_required: boolean().default(false).notNull(),
	warranty_start: date(),
	warranty_end: date(),
	status: grn_statusInPortal().default('Draft').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.batch_id],
			foreignColumns: [batchInPortal.batch_id],
			name: "grn_batch_id_fkey"
		}),
	foreignKey({
			columns: [table.bin_code],
			foreignColumns: [binInPortal.bin_code],
			name: "grn_bin_code_fkey"
		}),
	foreignKey({
			columns: [table.gate_entry_id],
			foreignColumns: [gate_entryInPortal.gate_entry_id],
			name: "grn_gate_entry_id_fkey"
		}),
	foreignKey({
			columns: [table.po_id, table.line_no],
			foreignColumns: [po_lineInPortal.po_id, po_lineInPortal.line_no],
			name: "grn_po_id_line_no_fkey"
		}),
	foreignKey({
			columns: [table.received_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "grn_received_by_fkey"
		}),
	foreignKey({
			columns: [table.receiving_location],
			foreignColumns: [locationInPortal.location_code],
			name: "grn_receiving_location_fkey"
		}),
	foreignKey({
			columns: [table.shipment_id],
			foreignColumns: [shipmentInPortal.shipment_id],
			name: "grn_shipment_id_fkey"
		}),
]);

export const quality_inspectionInPortal = portal.table("quality_inspection", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	inspection_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.quality_inspection_inspection_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	grn_id: varchar({ length: 20 }).notNull(),
	inspection_date: date().default(sql`CURRENT_DATE`).notNull(),
	inspected_by: varchar({ length: 20 }),
	inspection_type: inspection_kindInPortal().notNull(),
	checklist_ref: varchar({ length: 80 }),
	overall_result: inspection_resultInPortal(),
	remarks: text(),
	report_doc_id: uuid(),
}, (table) => [
	foreignKey({
			columns: [table.report_doc_id],
			foreignColumns: [documentInShared.doc_id],
			name: "fk_qi_doc"
		}),
	foreignKey({
			columns: [table.grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "quality_inspection_grn_id_fkey"
		}),
	foreignKey({
			columns: [table.inspected_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "quality_inspection_inspected_by_fkey"
		}),
	unique("quality_inspection_grn_id_key").on(table.grn_id),
]);

export const quality_inspection_lineInPortal = portal.table("quality_inspection_line", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	inspection_line_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.quality_inspection_line_inspection_line_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	inspection_id: bigint({ mode: "number" }).notNull(),
	parameter: varchar({ length: 120 }).notNull(),
	expected_value: varchar({ length: 120 }),
	observed_value: varchar({ length: 120 }),
	result: pass_failInPortal().notNull(),
	qty_accepted: numeric({ precision: 14, scale:  3 }),
	qty_rejected: numeric({ precision: 14, scale:  3 }),
	rejection_reason: varchar({ length: 160 }),
}, (table) => [
	foreignKey({
			columns: [table.inspection_id],
			foreignColumns: [quality_inspectionInPortal.inspection_id],
			name: "quality_inspection_line_inspection_id_fkey"
		}).onDelete("cascade"),
]);

export const return_to_vendorInPortal = portal.table("return_to_vendor", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rtv_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.return_to_vendor_rtv_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	rtv_no: varchar({ length: 20 }).notNull(),
	grn_id: varchar({ length: 20 }).notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	qty_returned: numeric({ precision: 14, scale:  3 }).notNull(),
	return_reason: rtv_reasonInPortal().notNull(),
	return_action: rtv_actionInPortal().notNull(),
	return_date: date(),
	transporter_id: varchar({ length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	debit_note_id: bigint({ mode: "number" }),
	replacement_grn_id: varchar({ length: 20 }),
	status: rtv_statusInPortal().default('Raised').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.debit_note_id],
			foreignColumns: [debit_noteInPortal.note_id],
			name: "fk_rtv_debit_note"
		}),
	foreignKey({
			columns: [table.grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "return_to_vendor_grn_id_fkey"
		}),
	foreignKey({
			columns: [table.replacement_grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "return_to_vendor_replacement_grn_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "return_to_vendor_sku_fkey"
		}),
	foreignKey({
			columns: [table.transporter_id],
			foreignColumns: [transporterInPortal.transporter_id],
			name: "return_to_vendor_transporter_id_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "return_to_vendor_vendor_id_fkey"
		}),
	unique("return_to_vendor_rtv_no_key").on(table.rtv_no),
]);

export const deploymentInPortal = portal.table("deployment", {
	deployment_id: varchar({ length: 20 }).primaryKey().notNull(),
	dept_code: varchar({ length: 20 }).notNull(),
	po_id: integer(),
	grn_id: varchar({ length: 20 }),
	sku: varchar({ length: 30 }).notNull(),
	from_bin: varchar({ length: 20 }),
	qty: numeric({ precision: 14, scale:  3 }).default('1').notNull(),
	serial_no: varchar({ length: 80 }),
	custodian: varchar({ length: 120 }),
	custodian_staff_id: varchar({ length: 20 }),
	facility_id: varchar({ length: 30 }),
	space_id: varchar({ length: 30 }),
	subspace_id: varchar({ length: 30 }),
	installed_by_type: installed_by_typeInPortal(),
	vendor_id: varchar({ length: 20 }),
	technician_id: varchar({ length: 20 }),
	scheduled_date: date(),
	site_readiness_checked: boolean().default(false).notNull(),
	pre_install_checklist: text(),
	actual_start: timestamp({ withTimezone: true, mode: 'string' }),
	actual_end: timestamp({ withTimezone: true, mode: 'string' }),
	installation_cost: numeric({ precision: 12, scale:  2 }),
	status: deployment_statusInPortal().default('Requested').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	ticket_id: bigint({ mode: "number" }),
}, (table) => [
	foreignKey({
			columns: [table.custodian_staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "deployment_custodian_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "deployment_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "deployment_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.from_bin],
			foreignColumns: [binInPortal.bin_code],
			name: "deployment_from_bin_fkey"
		}),
	foreignKey({
			columns: [table.grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "deployment_grn_id_fkey"
		}),
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "deployment_po_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "deployment_sku_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "deployment_space_id_fkey"
		}),
	foreignKey({
			columns: [table.subspace_id],
			foreignColumns: [subspaceInInfra.subspace_id],
			name: "deployment_subspace_id_fkey"
		}),
	foreignKey({
			columns: [table.technician_id],
			foreignColumns: [technicianInInfra.technician_id],
			name: "deployment_technician_id_fkey"
		}),
	foreignKey({
			columns: [table.ticket_id],
			foreignColumns: [maintenance_ticketInInfra.ticket_id],
			name: "deployment_ticket_id_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "deployment_vendor_id_fkey"
		}),
]);

export const commissioning_handoverInPortal = portal.table("commissioning_handover", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	commission_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.commissioning_handover_commission_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	deployment_id: varchar({ length: 20 }).notNull(),
	commissioning_date: date(),
	tested_by: varchar({ length: 20 }),
	test_result: test_resultInPortal(),
	test_report_doc_id: uuid(),
	handed_over_to: varchar({ length: 20 }),
	handover_date: date(),
	training_provided: boolean().default(false).notNull(),
	user_manual_received: boolean().default(false).notNull(),
	warranty_card_ref: varchar({ length: 80 }),
	amc_id: varchar({ length: 30 }),
	remarks: text(),
}, (table) => [
	foreignKey({
			columns: [table.amc_id],
			foreignColumns: [amc_contractInInfra.amc_id],
			name: "commissioning_handover_amc_id_fkey"
		}),
	foreignKey({
			columns: [table.deployment_id],
			foreignColumns: [deploymentInPortal.deployment_id],
			name: "commissioning_handover_deployment_id_fkey"
		}),
	foreignKey({
			columns: [table.handed_over_to],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "commissioning_handover_handed_over_to_fkey"
		}),
	foreignKey({
			columns: [table.tested_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "commissioning_handover_tested_by_fkey"
		}),
	foreignKey({
			columns: [table.test_report_doc_id],
			foreignColumns: [documentInShared.doc_id],
			name: "fk_comm_doc"
		}),
	unique("commissioning_handover_deployment_id_key").on(table.deployment_id),
]);

export const assetInPortal = portal.table("asset", {
	asset_tag: varchar({ length: 40 }).primaryKey().notNull(),
	sku: varchar({ length: 30 }).notNull(),
	serial_no: varchar({ length: 80 }),
	dept_code: varchar({ length: 20 }),
	deployment_id: varchar({ length: 20 }),
	grn_id: varchar({ length: 20 }),
	receipt_id: varchar({ length: 20 }),
	asset_id: varchar({ length: 40 }),
	status: asset_tag_statusInPortal().default('In_Store').notNull(),
	space_id: varchar({ length: 30 }),
}, (table) => [
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "asset_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.deployment_id],
			foreignColumns: [deploymentInPortal.deployment_id],
			name: "asset_deployment_id_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "asset_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "asset_grn_id_fkey"
		}),
	foreignKey({
			columns: [table.receipt_id],
			foreignColumns: [receiptInPortal.receipt_id],
			name: "asset_receipt_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "asset_sku_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "asset_space_id_fkey"
		}),
]);

export const asset_capitalisationInPortal = portal.table("asset_capitalisation", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	capitalisation_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.asset_capitalisation_capitalisation_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	asset_id: varchar({ length: 40 }).notNull(),
	asset_tag: varchar({ length: 40 }),
	deployment_id: varchar({ length: 20 }),
	grn_id: varchar({ length: 20 }),
	po_id: integer(),
	sku: varchar({ length: 30 }).notNull(),
	serial_no: varchar({ length: 80 }),
	space_id: varchar({ length: 30 }),
	capitalisation_date: date().notNull(),
	purchase_cost: numeric({ precision: 14, scale:  2 }).notNull(),
	freight_cost: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	installation_cost: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	capitalised_value: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`((purchase_cost + freight_cost) + installation_cost)`),
	depreciation_method: depreciation_methodInPortal(),
	useful_life_years: smallint(),
	salvage_value: numeric({ precision: 14, scale:  2 }),
	asset_gl_account_id: varchar({ length: 20 }),
	custodian_id: varchar({ length: 20 }),
	status: capitalisation_statusInPortal().default('Capitalised').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.asset_gl_account_id],
			foreignColumns: [gl_accountInPortal.gl_account_id],
			name: "asset_capitalisation_asset_gl_account_id_fkey"
		}),
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "asset_capitalisation_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.asset_tag],
			foreignColumns: [assetInPortal.asset_tag],
			name: "asset_capitalisation_asset_tag_fkey"
		}),
	foreignKey({
			columns: [table.custodian_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "asset_capitalisation_custodian_id_fkey"
		}),
	foreignKey({
			columns: [table.deployment_id],
			foreignColumns: [deploymentInPortal.deployment_id],
			name: "asset_capitalisation_deployment_id_fkey"
		}),
	foreignKey({
			columns: [table.grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "asset_capitalisation_grn_id_fkey"
		}),
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "asset_capitalisation_po_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "asset_capitalisation_sku_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "asset_capitalisation_space_id_fkey"
		}),
	unique("asset_capitalisation_asset_id_key").on(table.asset_id),
]);

export const asset_transferInPortal = portal.table("asset_transfer", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	asset_transfer_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.asset_transfer_asset_transfer_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	asset_id: varchar({ length: 40 }).notNull(),
	from_space_id: varchar({ length: 30 }),
	to_space_id: varchar({ length: 30 }),
	from_dept: varchar({ length: 20 }),
	to_dept: varchar({ length: 20 }),
	transfer_date: date().default(sql`CURRENT_DATE`).notNull(),
	reason: text(),
	approved_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "asset_transfer_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "asset_transfer_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.from_dept],
			foreignColumns: [departmentInRef.dept_code],
			name: "asset_transfer_from_dept_fkey"
		}),
	foreignKey({
			columns: [table.from_space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "asset_transfer_from_space_id_fkey"
		}),
	foreignKey({
			columns: [table.to_dept],
			foreignColumns: [departmentInRef.dept_code],
			name: "asset_transfer_to_dept_fkey"
		}),
	foreignKey({
			columns: [table.to_space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "asset_transfer_to_space_id_fkey"
		}),
]);

export const amc_renewalInPortal = portal.table("amc_renewal", {
	renewal_id: varchar({ length: 20 }).primaryKey().notNull(),
	sku: varchar({ length: 30 }).notNull(),
	location_code: varchar({ length: 10 }).notNull(),
	amc_id: varchar({ length: 30 }),
	requested_by: integer(),
	old_expiry: date(),
	new_expiry: date(),
	cost: numeric({ precision: 12, scale:  2 }),
	status: amc_renewal_statusInPortal().default('Proposed').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.amc_id],
			foreignColumns: [amc_contractInInfra.amc_id],
			name: "amc_renewal_amc_id_fkey"
		}),
	foreignKey({
			columns: [table.location_code],
			foreignColumns: [locationInPortal.location_code],
			name: "amc_renewal_location_code_fkey"
		}),
	foreignKey({
			columns: [table.requested_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "amc_renewal_requested_by_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "amc_renewal_sku_fkey"
		}),
]);

export const service_ticketInPortal = portal.table("service_ticket", {
	ticket_id: varchar({ length: 20 }).primaryKey().notNull(),
	asset_tag: varchar({ length: 40 }).notNull(),
	issue: varchar({ length: 200 }).notNull(),
	priority: priorityInInfra().default('Medium').notNull(),
	opened_by: integer(),
	opened_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	maintenance_ticket_id: bigint({ mode: "number" }),
	status: service_ticket_statusInPortal().default('Open').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.asset_tag],
			foreignColumns: [assetInPortal.asset_tag],
			name: "service_ticket_asset_tag_fkey"
		}),
	foreignKey({
			columns: [table.maintenance_ticket_id],
			foreignColumns: [maintenance_ticketInInfra.ticket_id],
			name: "service_ticket_maintenance_ticket_id_fkey"
		}),
	foreignKey({
			columns: [table.opened_by],
			foreignColumns: [app_userInPortal.user_id],
			name: "service_ticket_opened_by_fkey"
		}),
]);

export const budget_txnInPortal = portal.table("budget_txn", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	budget_txn_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.budget_txn_budget_txn_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	budget_code: varchar({ length: 30 }).notNull(),
	txn_type: budget_txn_typeInPortal().notNull(),
	reference_type: budget_ref_typeInPortal().notNull(),
	reference_id: varchar({ length: 40 }).notNull(),
	amount: numeric({ precision: 16, scale:  2 }).notNull(),
	txn_date: date().default(sql`CURRENT_DATE`).notNull(),
	posted_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_budget_txn_head").using("btree", table.budget_code.asc().nullsLast().op("date_ops"), table.txn_date.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.budget_code],
			foreignColumns: [budget_headInPortal.budget_code],
			name: "budget_txn_budget_code_fkey"
		}),
	foreignKey({
			columns: [table.posted_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "budget_txn_posted_by_fkey"
		}),
]);

export const vendor_invoiceInPortal = portal.table("vendor_invoice", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	invoice_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.vendor_invoice_invoice_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	invoice_no: varchar({ length: 60 }).notNull(),
	invoice_date: date().notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	po_id: integer(),
	grn_id: varchar({ length: 20 }),
	received_date: date(),
	basic_amount: numeric({ precision: 16, scale:  2 }).notNull(),
	discount_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	cgst_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	sgst_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	igst_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	freight_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	other_charges: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	invoice_total: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`((((((basic_amount - discount_amount) + cgst_amount) + sgst_amount) + igst_amount) + freight_amount) + other_charges)`),
	tds_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	retention_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	advance_adjusted: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	net_payable: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`(((((((((basic_amount - discount_amount) + cgst_amount) + sgst_amount) + igst_amount) + freight_amount) + other_charges) - tds_amount) - retention_amount) - advance_adjusted)`),
	due_date: date(),
	three_way_match_status: three_way_matchInPortal(),
	verified_by: varchar({ length: 20 }),
	approved_by: varchar({ length: 20 }),
	doc_id: uuid(),
	status: invoice_statusInPortal().default('Received').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.doc_id],
			foreignColumns: [documentInShared.doc_id],
			name: "fk_invoice_doc"
		}),
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "vendor_invoice_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "vendor_invoice_grn_id_fkey"
		}),
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "vendor_invoice_po_id_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "vendor_invoice_vendor_id_fkey"
		}),
	foreignKey({
			columns: [table.verified_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "vendor_invoice_verified_by_fkey"
		}),
	unique("vendor_invoice_vendor_id_invoice_no_key").on(table.invoice_no, table.vendor_id),
]);

export const vendor_invoice_lineInPortal = portal.table("vendor_invoice_line", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	invoice_line_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.vendor_invoice_line_invoice_line_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	invoice_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	po_line_id: bigint({ mode: "number" }),
	grn_id: varchar({ length: 20 }),
	sku: varchar({ length: 30 }).notNull(),
	qty_invoiced: numeric({ precision: 14, scale:  3 }).notNull(),
	qty_accepted: numeric({ precision: 14, scale:  3 }),
	unit_price: numeric({ precision: 14, scale:  2 }).notNull(),
	po_unit_price: numeric({ precision: 14, scale:  2 }),
	price_variance: numeric({ precision: 14, scale:  2 }).generatedAlwaysAs(sql`(unit_price - COALESCE(po_unit_price, unit_price))`),
	tax_pct: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	line_total: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`round(((qty_invoiced * unit_price) * ((1)::numeric + (tax_pct / (100)::numeric))), 2)`),
	gl_account_id: varchar({ length: 20 }),
	budget_code: varchar({ length: 30 }),
}, (table) => [
	foreignKey({
			columns: [table.budget_code],
			foreignColumns: [budget_headInPortal.budget_code],
			name: "vendor_invoice_line_budget_code_fkey"
		}),
	foreignKey({
			columns: [table.gl_account_id],
			foreignColumns: [gl_accountInPortal.gl_account_id],
			name: "vendor_invoice_line_gl_account_id_fkey"
		}),
	foreignKey({
			columns: [table.grn_id],
			foreignColumns: [grnInPortal.grn_id],
			name: "vendor_invoice_line_grn_id_fkey"
		}),
	foreignKey({
			columns: [table.invoice_id],
			foreignColumns: [vendor_invoiceInPortal.invoice_id],
			name: "vendor_invoice_line_invoice_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.po_line_id],
			foreignColumns: [po_lineInPortal.po_line_id],
			name: "vendor_invoice_line_po_line_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "vendor_invoice_line_sku_fkey"
		}),
]);

export const po_paymentInPortal = portal.table("po_payment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	payment_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.po_payment_payment_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	payment_no: varchar({ length: 30 }),
	po_id: integer(),
	vendor_id: varchar({ length: 20 }).notNull(),
	invoice_no: varchar({ length: 60 }),
	invoice_date: date(),
	invoice_amount: numeric({ precision: 16, scale:  2 }),
	payment_date: date(),
	payment_type: payment_typeInPortal().default('Against_Invoice').notNull(),
	mode: payment_modeInPortal(),
	bank_account_id: varchar({ length: 20 }),
	transaction_ref: varchar({ length: 60 }),
	gross_amount: numeric({ precision: 16, scale:  2 }).notNull(),
	tds_deducted: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	penalty_deducted: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	net_paid: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`((gross_amount - tds_deducted) - penalty_deducted)`),
	prepared_by: varchar({ length: 20 }),
	approved_by: varchar({ length: 20 }),
	status: payment_statusInPortal().default('Draft').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "po_payment_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "po_payment_po_id_fkey"
		}),
	foreignKey({
			columns: [table.prepared_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "po_payment_prepared_by_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "po_payment_vendor_id_fkey"
		}),
	unique("po_payment_payment_no_key").on(table.payment_no),
]);

export const advance_paymentInPortal = portal.table("advance_payment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	advance_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.advance_payment_advance_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	po_id: integer().notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	advance_amount: numeric({ precision: 16, scale:  2 }).notNull(),
	advance_date: date().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	payment_id: bigint({ mode: "number" }),
	adjusted_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	balance_amount: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`(advance_amount - adjusted_amount)`),
	bank_guarantee_ref: varchar({ length: 60 }),
	status: advance_statusInPortal().default('Paid').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.payment_id],
			foreignColumns: [po_paymentInPortal.payment_id],
			name: "advance_payment_payment_id_fkey"
		}),
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "advance_payment_po_id_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "advance_payment_vendor_id_fkey"
		}),
]);

export const payment_allocationInPortal = portal.table("payment_allocation", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	allocation_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.payment_allocation_allocation_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	payment_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	invoice_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	advance_id: bigint({ mode: "number" }),
	amount_allocated: numeric({ precision: 16, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.advance_id],
			foreignColumns: [advance_paymentInPortal.advance_id],
			name: "payment_allocation_advance_id_fkey"
		}),
	foreignKey({
			columns: [table.invoice_id],
			foreignColumns: [vendor_invoiceInPortal.invoice_id],
			name: "payment_allocation_invoice_id_fkey"
		}),
	foreignKey({
			columns: [table.payment_id],
			foreignColumns: [po_paymentInPortal.payment_id],
			name: "payment_allocation_payment_id_fkey"
		}),
]);

export const debit_noteInPortal = portal.table("debit_note", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	note_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.debit_note_note_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	note_type: note_typeInPortal().notNull(),
	note_no: varchar({ length: 30 }).notNull(),
	note_date: date().default(sql`CURRENT_DATE`).notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	invoice_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rtv_id: bigint({ mode: "number" }),
	reason: note_reasonInPortal().notNull(),
	basic_amount: numeric({ precision: 16, scale:  2 }).notNull(),
	tax_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	total_amount: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`(basic_amount + tax_amount)`),
	status: note_statusInPortal().default('Raised').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.invoice_id],
			foreignColumns: [vendor_invoiceInPortal.invoice_id],
			name: "debit_note_invoice_id_fkey"
		}),
	foreignKey({
			columns: [table.rtv_id],
			foreignColumns: [return_to_vendorInPortal.rtv_id],
			name: "debit_note_rtv_id_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "debit_note_vendor_id_fkey"
		}),
	unique("debit_note_note_no_key").on(table.note_no),
]);

export const journal_entryInPortal = portal.table("journal_entry", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	journal_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.journal_entry_journal_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	journal_date: date().default(sql`CURRENT_DATE`).notNull(),
	source_type: journal_sourceInPortal().notNull(),
	source_id: varchar({ length: 40 }).notNull(),
	narration: text(),
	posted_by: varchar({ length: 20 }),
	status: journal_statusInPortal().default('Draft').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.posted_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "journal_entry_posted_by_fkey"
		}),
]);

export const journal_lineInPortal = portal.table("journal_line", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	journal_line_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.journal_line_journal_line_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	journal_id: bigint({ mode: "number" }).notNull(),
	gl_account_id: varchar({ length: 20 }).notNull(),
	dept_code: varchar({ length: 20 }),
	budget_code: varchar({ length: 30 }),
	debit_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
	credit_amount: numeric({ precision: 16, scale:  2 }).default('0').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.budget_code],
			foreignColumns: [budget_headInPortal.budget_code],
			name: "journal_line_budget_code_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "journal_line_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.gl_account_id],
			foreignColumns: [gl_accountInPortal.gl_account_id],
			name: "journal_line_gl_account_id_fkey"
		}),
	foreignKey({
			columns: [table.journal_id],
			foreignColumns: [journal_entryInPortal.journal_id],
			name: "journal_line_journal_id_fkey"
		}).onDelete("cascade"),
	check("journal_line_check", sql`(debit_amount >= (0)::numeric) AND (credit_amount >= (0)::numeric) AND ((debit_amount = (0)::numeric) OR (credit_amount = (0)::numeric))`),
]);

export const vendor_performanceInPortal = portal.table("vendor_performance", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	perf_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "portal.vendor_performance_perf_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	vendor_id: varchar({ length: 20 }).notNull(),
	po_id: integer(),
	on_time_delivery: boolean(),
	delay_days: integer(),
	quality_score: numeric({ precision: 3, scale:  1 }),
	rejection_pct: numeric({ precision: 5, scale:  2 }),
	invoice_accuracy: boolean(),
	service_response_score: numeric({ precision: 3, scale:  1 }),
	composite_score: numeric({ precision: 4, scale:  2 }),
	recorded_by: varchar({ length: 20 }),
	recorded_date: date().default(sql`CURRENT_DATE`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "vendor_performance_po_id_fkey"
		}),
	foreignKey({
			columns: [table.recorded_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "vendor_performance_recorded_by_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "vendor_performance_vendor_id_fkey"
		}),
]);

export const approval_stepInShared = shared.table("approval_step", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	step_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "shared.approval_step_step_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	request_type: request_typeInShared().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	request_id: bigint({ mode: "number" }).notNull(),
	level: smallint().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rule_id: bigint({ mode: "number" }),
	approver_role: varchar({ length: 30 }).notNull(),
	acted_by: varchar({ length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	acted_by_contact: bigint({ mode: "number" }),
	decision: decisionInShared().default('Pending').notNull(),
	decided_on: timestamp({ withTimezone: true, mode: 'string' }),
	remarks: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_approval_step_pending").using("btree", table.approver_role.asc().nullsLast().op("text_ops"), table.decision.asc().nullsLast().op("text_ops")).where(sql`(decision = 'Pending'::shared.decision)`),
	foreignKey({
			columns: [table.acted_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "approval_step_acted_by_fkey"
		}),
	foreignKey({
			columns: [table.approver_role],
			foreignColumns: [roleInPortal.role_code],
			name: "approval_step_approver_role_fkey"
		}),
	foreignKey({
			columns: [table.rule_id],
			foreignColumns: [approval_ruleInShared.rule_id],
			name: "approval_step_rule_id_fkey"
		}),
	foreignKey({
			columns: [table.acted_by_contact],
			foreignColumns: [student_contactInHostel.contact_id],
			name: "fk_step_contact"
		}),
	unique("approval_step_request_type_request_id_level_key").on(table.level, table.request_id, table.request_type),
	check("approval_step_check", sql`(decision = 'Pending'::shared.decision) OR (decided_on IS NOT NULL)`),
]);

export const policy_settingInShared = shared.table("policy_setting", {
	setting_key: varchar({ length: 60 }).primaryKey().notNull(),
	module: varchar({ length: 20 }).default('hostel').notNull(),
	amount: numeric({ precision: 16, scale:  2 }),
	value_text: varchar({ length: 200 }),
	meaning: varchar({ length: 300 }).notNull(),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.updated_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "policy_setting_updated_by_fkey"
		}),
]);

export const documentInShared = shared.table("document", {
	doc_id: uuid().defaultRandom().primaryKey().notNull(),
	kind: document_kindInShared().notNull(),
	file_name: varchar({ length: 200 }).notNull(),
	object_key: varchar({ length: 300 }).notNull(),
	mime_type: varchar({ length: 80 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	size_bytes: bigint({ mode: "number" }),
	sha256: char({ length: 64 }),
	attached_to: varchar({ length: 40 }),
	attached_id: varchar({ length: 40 }),
	uploaded_by: varchar({ length: 20 }),
	uploaded_by_student: varchar({ length: 20 }),
	uploaded_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_document_attached").using("btree", table.attached_to.asc().nullsLast().op("text_ops"), table.attached_id.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.uploaded_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "document_uploaded_by_fkey"
		}),
	foreignKey({
			columns: [table.uploaded_by_student],
			foreignColumns: [student_masterInRef.student_id],
			name: "document_uploaded_by_student_fkey"
		}),
]);

export const import_batchInShared = shared.table("import_batch", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batch_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "shared.import_batch_batch_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	source: import_sourceInShared().notNull(),
	file_name: varchar({ length: 200 }),
	received_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	rows_total: integer(),
	rows_ok: integer(),
	rows_failed: integer(),
	status: import_statusInShared().default('Received').notNull(),
	processed_by: varchar({ length: 20 }),
	error_report: text(),
}, (table) => [
	foreignKey({
			columns: [table.processed_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "import_batch_processed_by_fkey"
		}),
]);

export const approval_ruleInShared = shared.table("approval_rule", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rule_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "shared.approval_rule_rule_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	request_type: request_typeInShared().notNull(),
	level: smallint().notNull(),
	approver_role: varchar({ length: 30 }).notNull(),
	condition_key: varchar({ length: 40 }),
	condition_value: varchar({ length: 40 }),
	is_mandatory: boolean().default(true).notNull(),
	sla_hours: integer(),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.approver_role],
			foreignColumns: [roleInPortal.role_code],
			name: "approval_rule_approver_role_fkey"
		}),
	unique("approval_rule_request_type_level_condition_key_condition_va_key").on(table.condition_key, table.condition_value, table.level, table.request_type),
]);

export const notificationInShared = shared.table("notification", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	notification_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "shared.notification_notification_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	recipient_type: recipient_typeInShared().notNull(),
	student_id: varchar({ length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contact_id: bigint({ mode: "number" }),
	staff_id: varchar({ length: 20 }),
	channel: channelInShared().notNull(),
	template_code: varchar({ length: 40 }),
	subject: varchar({ length: 200 }),
	body: text().notNull(),
	related_type: varchar({ length: 40 }),
	related_id: varchar({ length: 40 }),
	queued_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	sent_at: timestamp({ withTimezone: true, mode: 'string' }),
	delivery_status: delivery_statusInShared().default('Queued').notNull(),
	provider_ref: varchar({ length: 80 }),
	error_text: text(),
}, (table) => [
	index("ix_notification_queue").using("btree", table.delivery_status.asc().nullsLast().op("timestamptz_ops"), table.queued_at.asc().nullsLast().op("timestamptz_ops")).where(sql`(delivery_status = 'Queued'::shared.delivery_status)`),
	foreignKey({
			columns: [table.contact_id],
			foreignColumns: [student_contactInHostel.contact_id],
			name: "fk_notif_contact"
		}),
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "notification_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "notification_student_id_fkey"
		}),
]);

export const mess_masterInHostel = hostel.table("mess_master", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	mess_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.mess_master_mess_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	mess_name: varchar({ length: 80 }).notNull(),
	facility_id: varchar({ length: 30 }),
	space_id: varchar({ length: 30 }),
	incharge_id: varchar({ length: 20 }),
	capacity: integer(),
	annual_fee: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "mess_master_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.incharge_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "mess_master_incharge_id_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "mess_master_space_id_fkey"
		}),
]);

export const hostel_profileInHostel = hostel.table("hostel_profile", {
	facility_id: varchar({ length: 30 }).primaryKey().notNull(),
	hostel_code: varchar({ length: 10 }).notNull(),
	hostel_gender: hostel_genderInHostel().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	default_mess_id: bigint({ mode: "number" }),
	sub_store_code: varchar({ length: 10 }),
	dept_code: varchar({ length: 20 }).notNull(),
	gate_close_time: time().default('21:30:00').notNull(),
	status: hostel_statusInHostel().default('Active').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.default_mess_id],
			foreignColumns: [mess_masterInHostel.mess_id],
			name: "hostel_profile_default_mess_id_fkey"
		}),
	foreignKey({
			columns: [table.dept_code],
			foreignColumns: [departmentInRef.dept_code],
			name: "hostel_profile_dept_code_fkey"
		}),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "hostel_profile_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.sub_store_code],
			foreignColumns: [locationInPortal.location_code],
			name: "hostel_profile_sub_store_code_fkey"
		}),
	unique("hostel_profile_hostel_code_key").on(table.hostel_code),
]);

export const student_contactInHostel = hostel.table("student_contact", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contact_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.student_contact_contact_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	student_id: varchar({ length: 20 }).notNull(),
	relation: contact_relationInHostel().notNull(),
	contact_name: varchar({ length: 120 }).notNull(),
	mobile_no: varchar({ length: 10 }).notNull(),
	is_verified: boolean().default(false).notNull(),
	verified_on: timestamp({ withTimezone: true, mode: 'string' }),
	is_outpass_approver: boolean().default(false).notNull(),
	status: active_statusInShared().default('Active').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	uniqueIndex("ux_student_contact_outpass_approver").using("btree", table.student_id.asc().nullsLast().op("text_ops")).where(sql`(is_outpass_approver AND (status = 'Active'::shared.active_status))`),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "student_contact_student_id_fkey"
		}),
	unique("student_contact_student_id_relation_mobile_no_key").on(table.mobile_no, table.relation, table.student_id),
	check("student_contact_mobile_no_check", sql`(mobile_no)::text ~ '^[6-9][0-9]{9}$'::text`),
]);

export const room_typeInHostel = hostel.table("room_type", {
	room_type_id: smallint().primaryKey().generatedAlwaysAsIdentity({ name: "hostel.room_type_room_type_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 32767, cache: 1 }),
	type_name: varchar({ length: 60 }).notNull(),
	sharing_count: smallint().notNull(),
	is_ac: boolean().default(false).notNull(),
	attached_bath: boolean().default(false).notNull(),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	unique("room_type_type_name_key").on(table.type_name),
	check("room_type_sharing_count_check", sql`(sharing_count >= 1) AND (sharing_count <= 8)`),
]);

export const room_type_feeInHostel = hostel.table("room_type_fee", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fee_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.room_type_fee_fee_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	room_type_id: smallint().notNull(),
	facility_id: varchar({ length: 30 }).notNull(),
	academic_year: varchar({ length: 9 }).notNull(),
	registration_fee: numeric({ precision: 12, scale:  2 }).notNull(),
	hostel_fee: numeric({ precision: 12, scale:  2 }).notNull(),
	instalment_1_pct: numeric({ precision: 5, scale:  2 }).default('50').notNull(),
	instalment_2_due_date: date().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.academic_year],
			foreignColumns: [academic_yearInHostel.academic_year],
			name: "room_type_fee_academic_year_fkey"
		}),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [hostel_profileInHostel.facility_id],
			name: "room_type_fee_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.room_type_id],
			foreignColumns: [room_typeInHostel.room_type_id],
			name: "room_type_fee_room_type_id_fkey"
		}),
	unique("room_type_fee_room_type_id_facility_id_academic_year_key").on(table.academic_year, table.facility_id, table.room_type_id),
	check("room_type_fee_instalment_1_pct_check", sql`(instalment_1_pct >= (1)::numeric) AND (instalment_1_pct <= (100)::numeric)`),
]);

export const academic_yearInHostel = hostel.table("academic_year", {
	academic_year: varchar({ length: 9 }).primaryKey().notNull(),
	start_date: date().notNull(),
	end_date: date().notNull(),
	is_current: boolean().default(false).notNull(),
}, (table) => [
	uniqueIndex("ux_academic_year_current").using("btree", table.is_current.asc().nullsLast().op("bool_ops")).where(sql`is_current`),
	check("academic_year_check", sql`end_date > start_date`),
]);

export const room_profileInHostel = hostel.table("room_profile", {
	space_id: varchar({ length: 30 }).primaryKey().notNull(),
	room_type_id: smallint().notNull(),
	reserved_for: reserved_forInHostel().default('None').notNull(),
	is_accessible: boolean().default(false).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	nearest_point_id: bigint({ mode: "number" }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.nearest_point_id],
			foreignColumns: [capture_pointInHostel.point_id],
			name: "fk_room_nearest_point"
		}),
	foreignKey({
			columns: [table.room_type_id],
			foreignColumns: [room_typeInHostel.room_type_id],
			name: "room_profile_room_type_id_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "room_profile_space_id_fkey"
		}),
]);

export const mess_subscriptionInHostel = hostel.table("mess_subscription", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	subscription_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.mess_subscription_subscription_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	student_id: varchar({ length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	mess_id: bigint({ mode: "number" }).notNull(),
	academic_year: varchar({ length: 9 }).notNull(),
	cuisine: cuisineInHostel().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	mess_demand_id: bigint({ mode: "number" }),
	from_date: date().default(sql`CURRENT_DATE`).notNull(),
	to_date: date(),
	status: subscription_statusInHostel().default('Active').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	uniqueIndex("ux_mess_subscription_active").using("btree", table.student_id.asc().nullsLast().op("text_ops")).where(sql`(status = 'Active'::hostel.subscription_status)`),
	foreignKey({
			columns: [table.mess_demand_id],
			foreignColumns: [fee_demandInHostel.demand_id],
			name: "fk_mess_sub_demand"
		}),
	foreignKey({
			columns: [table.academic_year],
			foreignColumns: [academic_yearInHostel.academic_year],
			name: "mess_subscription_academic_year_fkey"
		}),
	foreignKey({
			columns: [table.mess_id],
			foreignColumns: [mess_masterInHostel.mess_id],
			name: "mess_subscription_mess_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "mess_subscription_student_id_fkey"
		}),
]);

export const discipline_caseInHostel = hostel.table("discipline_case", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	case_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.discipline_case_case_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	student_id: varchar({ length: 20 }).notNull(),
	incident_on: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	description: text().notNull(),
	reported_by: varchar({ length: 20 }),
	status: varchar({ length: 20 }).default('Open').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.reported_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "discipline_case_reported_by_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "discipline_case_student_id_fkey"
		}),
]);

export const discipline_punishmentInHostel = hostel.table("discipline_punishment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	punishment_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.discipline_punishment_punishment_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	case_id: bigint({ mode: "number" }).notNull(),
	student_id: varchar({ length: 20 }).notNull(),
	punishment_type: punishment_typeInHostel().notNull(),
	bars_outings: boolean().default(false).notNull(),
	from_date: date().notNull(),
	to_date: date(),
	fine_amount: numeric({ precision: 12, scale:  2 }),
	awarded_by: varchar({ length: 20 }),
	status: punishment_statusInHostel().default('In_Force').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_punishment_student_force").using("btree", table.student_id.asc().nullsLast().op("text_ops")).where(sql`((status = 'In_Force'::hostel.punishment_status) AND bars_outings)`),
	foreignKey({
			columns: [table.awarded_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "discipline_punishment_awarded_by_fkey"
		}),
	foreignKey({
			columns: [table.case_id],
			foreignColumns: [discipline_caseInHostel.case_id],
			name: "discipline_punishment_case_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "discipline_punishment_student_id_fkey"
		}),
]);

export const vacate_requestInHostel = hostel.table("vacate_request", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacate_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.vacate_request_vacate_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	student_id: varchar({ length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hostel_alloc_id: bigint({ mode: "number" }),
	reason: vacate_reasonInHostel().notNull(),
	reason_detail: text(),
	proof_doc_id: uuid(),
	planned_date: date().notNull(),
	applied_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	levels_required: smallint().default(4).notNull(),
	status: vacate_statusInHostel().default('Applied').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.hostel_alloc_id],
			foreignColumns: [hostel_allocationInHostel.hostel_alloc_id],
			name: "fk_vacate_alloc"
		}),
	foreignKey({
			columns: [table.proof_doc_id],
			foreignColumns: [documentInShared.doc_id],
			name: "vacate_request_proof_doc_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "vacate_request_student_id_fkey"
		}),
]);

export const no_dues_clearanceInHostel = hostel.table("no_dues_clearance", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clearance_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.no_dues_clearance_clearance_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacate_id: bigint({ mode: "number" }).notNull(),
	section: clearance_sectionInHostel().notNull(),
	dues_amount: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	demand_id: bigint({ mode: "number" }),
	cleared_by: varchar({ length: 20 }),
	cleared_on: timestamp({ withTimezone: true, mode: 'string' }),
	remarks: text(),
	status: clearance_statusInHostel().default('Pending').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.demand_id],
			foreignColumns: [fee_demandInHostel.demand_id],
			name: "fk_clearance_demand"
		}),
	foreignKey({
			columns: [table.cleared_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "no_dues_clearance_cleared_by_fkey"
		}),
	foreignKey({
			columns: [table.vacate_id],
			foreignColumns: [vacate_requestInHostel.vacate_id],
			name: "no_dues_clearance_vacate_id_fkey"
		}),
	unique("no_dues_clearance_vacate_id_section_key").on(table.section, table.vacate_id),
]);

export const hostel_registrationInHostel = hostel.table("hostel_registration", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	registration_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.hostel_registration_registration_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	registration_no: varchar({ length: 20 }),
	student_id: varchar({ length: 20 }).notNull(),
	academic_year: varchar({ length: 9 }).notNull(),
	facility_id: varchar({ length: 30 }).notNull(),
	room_type_id: smallint().notNull(),
	applied_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	reg_demand_id: bigint({ mode: "number" }),
	rules_accepted: boolean().default(false).notNull(),
	waitlist_no: integer(),
	status: registration_statusInHostel().default('Applied').notNull(),
	remarks: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_registration_facility_status").using("btree", table.facility_id.asc().nullsLast().op("text_ops"), table.academic_year.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.reg_demand_id],
			foreignColumns: [fee_demandInHostel.demand_id],
			name: "fk_registration_reg_demand"
		}),
	foreignKey({
			columns: [table.academic_year],
			foreignColumns: [academic_yearInHostel.academic_year],
			name: "hostel_registration_academic_year_fkey"
		}),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [hostel_profileInHostel.facility_id],
			name: "hostel_registration_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.room_type_id],
			foreignColumns: [room_typeInHostel.room_type_id],
			name: "hostel_registration_room_type_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "hostel_registration_student_id_fkey"
		}),
	unique("hostel_registration_registration_no_key").on(table.registration_no),
	unique("hostel_registration_student_id_academic_year_key").on(table.academic_year, table.student_id),
	check("ck_reg_no_present", sql`registration_no IS NOT NULL)) NOT VALID`),
	check("hostel_registration_rules_accepted_check", sql`CHECK (rules_accepted)`),
]);

export const hostel_allocationInHostel = hostel.table("hostel_allocation", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hostel_alloc_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.hostel_allocation_hostel_alloc_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	occupant_type: occupant_typeInHostel().default('Student').notNull(),
	student_id: varchar({ length: 20 }),
	staff_id: varchar({ length: 20 }),
	subspace_id: varchar({ length: 30 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	offer_id: bigint({ mode: "number" }),
	academic_year: varchar({ length: 9 }).notNull(),
	allocation_date: date().default(sql`CURRENT_DATE`).notNull(),
	vacate_date: date(),
	key_no: varchar({ length: 20 }).notNull(),
	checked_in_by: varchar({ length: 20 }).notNull(),
	approved_by: varchar({ length: 20 }),
	status: allocation_statusInHostel().default('Active').notNull(),
	remarks: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	uniqueIndex("ux_allocation_active_bed").using("btree", table.subspace_id.asc().nullsLast().op("text_ops")).where(sql`(status = 'Active'::hostel.allocation_status)`),
	uniqueIndex("ux_allocation_active_student").using("btree", table.student_id.asc().nullsLast().op("text_ops")).where(sql`((status = 'Active'::hostel.allocation_status) AND (student_id IS NOT NULL))`),
	uniqueIndex("ux_allocation_offer").using("btree", table.offer_id.asc().nullsLast().op("int8_ops")).where(sql`(offer_id IS NOT NULL)`),
	foreignKey({
			columns: [table.academic_year],
			foreignColumns: [academic_yearInHostel.academic_year],
			name: "hostel_allocation_academic_year_fkey"
		}),
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "hostel_allocation_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.checked_in_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "hostel_allocation_checked_in_by_fkey"
		}),
	foreignKey({
			columns: [table.offer_id],
			foreignColumns: [room_offerInHostel.offer_id],
			name: "hostel_allocation_offer_id_fkey"
		}),
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "hostel_allocation_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "hostel_allocation_student_id_fkey"
		}),
	foreignKey({
			columns: [table.subspace_id],
			foreignColumns: [subspaceInInfra.subspace_id],
			name: "hostel_allocation_subspace_id_fkey"
		}),
	check("hostel_allocation_check", sql`((occupant_type = 'Student'::hostel.occupant_type) AND (student_id IS NOT NULL) AND (staff_id IS NULL)) OR ((occupant_type = 'Staff'::hostel.occupant_type) AND (staff_id IS NOT NULL) AND (student_id IS NULL))`),
	check("hostel_allocation_check1", sql`(vacate_date IS NULL) OR (vacate_date >= allocation_date)`),
	check("hostel_allocation_check2", sql`(status <> 'Active'::hostel.allocation_status) OR (vacate_date IS NULL)`),
]);

export const room_offerInHostel = hostel.table("room_offer", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	offer_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.room_offer_offer_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	registration_id: bigint({ mode: "number" }).notNull(),
	subspace_id: varchar({ length: 30 }).notNull(),
	offer_no: smallint().notNull(),
	offered_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	hold_until: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	offered_by: varchar({ length: 20 }),
	student_decision: student_decisionInHostel().default('Pending').notNull(),
	decision_on: timestamp({ withTimezone: true, mode: 'string' }),
	decline_reason: text(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	uniqueIndex("ux_room_offer_pending_bed").using("btree", table.subspace_id.asc().nullsLast().op("text_ops")).where(sql`(student_decision = 'Pending'::hostel.student_decision)`),
	uniqueIndex("ux_room_offer_pending_reg").using("btree", table.registration_id.asc().nullsLast().op("int8_ops")).where(sql`(student_decision = 'Pending'::hostel.student_decision)`),
	foreignKey({
			columns: [table.offered_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "room_offer_offered_by_fkey"
		}),
	foreignKey({
			columns: [table.registration_id],
			foreignColumns: [hostel_registrationInHostel.registration_id],
			name: "room_offer_registration_id_fkey"
		}),
	foreignKey({
			columns: [table.subspace_id],
			foreignColumns: [subspaceInInfra.subspace_id],
			name: "room_offer_subspace_id_fkey"
		}),
	unique("room_offer_registration_id_offer_no_key").on(table.offer_no, table.registration_id),
	check("room_offer_check", sql`(student_decision <> 'Declined'::hostel.student_decision) OR (decline_reason IS NOT NULL)`),
	check("room_offer_check1", sql`hold_until > offered_on`),
]);

export const room_handoverInHostel = hostel.table("room_handover", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	handover_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.room_handover_handover_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hostel_alloc_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacate_id: bigint({ mode: "number" }),
	handover_type: handover_typeInHostel().notNull(),
	handover_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	meter_reading: numeric({ precision: 12, scale:  2 }).notNull(),
	key_returned: boolean(),
	done_by: varchar({ length: 20 }).notNull(),
	occupant_acknowledged: boolean().default(false).notNull(),
	total_damage_amount: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.done_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "room_handover_done_by_fkey"
		}),
	foreignKey({
			columns: [table.hostel_alloc_id],
			foreignColumns: [hostel_allocationInHostel.hostel_alloc_id],
			name: "room_handover_hostel_alloc_id_fkey"
		}),
	foreignKey({
			columns: [table.vacate_id],
			foreignColumns: [vacate_requestInHostel.vacate_id],
			name: "room_handover_vacate_id_fkey"
		}),
	unique("room_handover_hostel_alloc_id_handover_type_key").on(table.handover_type, table.hostel_alloc_id),
	check("room_handover_check", sql`(handover_type <> 'Check_Out'::hostel.handover_type) OR ((key_returned IS NOT NULL) AND (vacate_id IS NOT NULL))`),
]);

export const fee_planInHostel = hostel.table("fee_plan", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fee_plan_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.fee_plan_fee_plan_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	registration_id: bigint({ mode: "number" }).notNull(),
	plan_type: plan_typeInHostel().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fee_id: bigint({ mode: "number" }).notNull(),
	created_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	status: plan_statusInHostel().default('Open').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.fee_id],
			foreignColumns: [room_type_feeInHostel.fee_id],
			name: "fee_plan_fee_id_fkey"
		}),
	foreignKey({
			columns: [table.registration_id],
			foreignColumns: [hostel_registrationInHostel.registration_id],
			name: "fee_plan_registration_id_fkey"
		}),
	unique("fee_plan_registration_id_key").on(table.registration_id),
]);

export const fee_demandInHostel = hostel.table("fee_demand", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	demand_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.fee_demand_demand_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	student_id: varchar({ length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fee_plan_id: bigint({ mode: "number" }),
	fee_head: fee_headInHostel().notNull(),
	instalment_no: smallint().default(1).notNull(),
	amount_due: numeric({ precision: 12, scale:  2 }).notNull(),
	due_date: date().notNull(),
	amount_paid: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	status: demand_statusInHostel().default('Pending').notNull(),
	reference_type: varchar({ length: 30 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	reference_id: bigint({ mode: "number" }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_fee_demand_student_status").using("btree", table.student_id.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	uniqueIndex("ux_fee_demand_plan_head_inst").using("btree", table.fee_plan_id.asc().nullsLast().op("int2_ops"), table.fee_head.asc().nullsLast().op("int2_ops"), table.instalment_no.asc().nullsLast().op("int2_ops")).where(sql`(fee_plan_id IS NOT NULL)`),
	uniqueIndex("ux_fee_demand_reference").using("btree", table.reference_type.asc().nullsLast().op("int8_ops"), table.reference_id.asc().nullsLast().op("int8_ops")).where(sql`((reference_type)::text = ANY ((ARRAY['room_handover'::character varying, 'meter_recharge'::character varying, 'discipline_punishment'::character varying])::text[]))`),
	foreignKey({
			columns: [table.fee_plan_id],
			foreignColumns: [fee_planInHostel.fee_plan_id],
			name: "fee_demand_fee_plan_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "fee_demand_student_id_fkey"
		}),
	check("fee_demand_amount_due_check", sql`amount_due >= (0)::numeric`),
	check("fee_demand_check", sql`(fee_head = 'Hostel'::hostel.fee_head) OR (instalment_no = 1)`),
	check("fee_demand_instalment_no_check", sql`instalment_no = ANY (ARRAY[1, 2])`),
]);

export const staff_space_assignmentInHostel = hostel.table("staff_space_assignment", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	assignment_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.staff_space_assignment_assignment_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	staff_id: varchar({ length: 20 }).notNull(),
	hostel_role: varchar({ length: 30 }).notNull(),
	facility_id: varchar({ length: 30 }).notNull(),
	zone_id: varchar({ length: 30 }),
	space_id: varchar({ length: 30 }),
	shift: shiftInHostel().default('General').notNull(),
	from_date: date().default(sql`CURRENT_DATE`).notNull(),
	to_date: date(),
	show_on_qr: boolean().default(false).notNull(),
	status: assignment_statusInHostel().default('Active').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_assignment_lookup").using("btree", table.facility_id.asc().nullsLast().op("text_ops"), table.zone_id.asc().nullsLast().op("text_ops"), table.hostel_role.asc().nullsLast().op("text_ops")).where(sql`(status = 'Active'::hostel.assignment_status)`),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [hostel_profileInHostel.facility_id],
			name: "staff_space_assignment_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.hostel_role],
			foreignColumns: [roleInPortal.role_code],
			name: "staff_space_assignment_hostel_role_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "staff_space_assignment_space_id_fkey"
		}),
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "staff_space_assignment_staff_id_fkey"
		}),
	foreignKey({
			columns: [table.zone_id],
			foreignColumns: [zoneInInfra.zone_id],
			name: "staff_space_assignment_zone_id_fkey"
		}),
	check("staff_space_assignment_check", sql`(to_date IS NULL) OR (to_date >= from_date)`),
	check("staff_space_assignment_check1", sql`(status = 'Active'::hostel.assignment_status) OR (to_date IS NOT NULL)`),
]);

export const space_qrInHostel = hostel.table("space_qr", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	qr_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.space_qr_qr_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	space_id: varchar({ length: 30 }).notNull(),
	qr_token: varchar({ length: 64 }).default(sql`encode(gen_random_bytes(24), 'hex')`).notNull(),
	generated_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	printed_on: timestamp({ withTimezone: true, mode: 'string' }),
	status: qr_statusInHostel().default('Active').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	uniqueIndex("ux_space_qr_active").using("btree", table.space_id.asc().nullsLast().op("text_ops")).where(sql`(status = 'Active'::hostel.qr_status)`),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "space_qr_space_id_fkey"
		}),
	unique("space_qr_qr_token_key").on(table.qr_token),
]);

export const room_meterInHostel = hostel.table("room_meter", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	meter_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.room_meter_meter_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	space_id: varchar({ length: 30 }).notNull(),
	meter_no: varchar({ length: 40 }).notNull(),
	meter_type: meter_typeInHostel().notNull(),
	device_ref: varchar({ length: 80 }),
	installed_on: date().notNull(),
	asset_id: varchar({ length: 40 }),
	status: meter_statusInHostel().default('Active').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	uniqueIndex("ux_room_meter_active").using("btree", table.space_id.asc().nullsLast().op("text_ops")).where(sql`(status = 'Active'::hostel.meter_status)`),
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "room_meter_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "room_meter_space_id_fkey"
		}),
	unique("room_meter_meter_no_key").on(table.meter_no),
	check("room_meter_check", sql`(meter_type <> 'Smart_Prepaid'::hostel.meter_type) OR (device_ref IS NOT NULL)`),
]);

export const electricity_tariffInHostel = hostel.table("electricity_tariff", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	tariff_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.electricity_tariff_tariff_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	room_type_id: smallint().notNull(),
	included_units_per_month: numeric({ precision: 10, scale:  2 }).notNull(),
	rate_per_unit: numeric({ precision: 8, scale:  2 }).notNull(),
	effective_from: date().notNull(),
	effective_to: date(),
	approved_by: varchar({ length: 20 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "electricity_tariff_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.room_type_id],
			foreignColumns: [room_typeInHostel.room_type_id],
			name: "electricity_tariff_room_type_id_fkey"
		}),
]);

export const meter_student_mapInHostel = hostel.table("meter_student_map", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	map_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.meter_student_map_map_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	meter_id: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hostel_alloc_id: bigint({ mode: "number" }).notNull(),
	from_datetime: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	to_datetime: timestamp({ withTimezone: true, mode: 'string' }),
	share_pct: numeric({ precision: 5, scale:  2 }).default('100').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_meter_map_open").using("btree", table.meter_id.asc().nullsLast().op("int8_ops")).where(sql`(to_datetime IS NULL)`),
	foreignKey({
			columns: [table.hostel_alloc_id],
			foreignColumns: [hostel_allocationInHostel.hostel_alloc_id],
			name: "meter_student_map_hostel_alloc_id_fkey"
		}),
	foreignKey({
			columns: [table.meter_id],
			foreignColumns: [room_meterInHostel.meter_id],
			name: "meter_student_map_meter_id_fkey"
		}),
	unique("meter_student_map_hostel_alloc_id_key").on(table.hostel_alloc_id),
	check("meter_student_map_check", sql`(to_datetime IS NULL) OR (to_datetime >= from_datetime)`),
	check("meter_student_map_share_pct_check", sql`(share_pct > (0)::numeric) AND (share_pct <= (100)::numeric)`),
]);

export const fee_receiptInHostel = hostel.table("fee_receipt", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	receipt_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.fee_receipt_receipt_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	receipt_no: varchar({ length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	demand_id: bigint({ mode: "number" }).notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	paid_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	payment_mode: payment_modeInHostel().notNull(),
	gateway_ref: varchar({ length: 80 }),
	gateway_status: gateway_statusInHostel().default('Pending').notNull(),
	is_refundable: boolean().default(true).notNull(),
	collected_by: varchar({ length: 20 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
}, (table) => [
	uniqueIndex("ux_fee_receipt_gateway_ref").using("btree", table.gateway_ref.asc().nullsLast().op("text_ops")).where(sql`(gateway_ref IS NOT NULL)`),
	foreignKey({
			columns: [table.collected_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "fee_receipt_collected_by_fkey"
		}),
	foreignKey({
			columns: [table.demand_id],
			foreignColumns: [fee_demandInHostel.demand_id],
			name: "fee_receipt_demand_id_fkey"
		}),
	unique("fee_receipt_receipt_no_key").on(table.receipt_no),
	check("ck_receipt_no_present", sql`receipt_no IS NOT NULL)) NOT VALID`),
	check("fee_receipt_amount_check", sql`amount > (0)::numeric`),
	check("fee_receipt_check", sql`(payment_mode <> ALL (ARRAY['UPI'::hostel.payment_mode, 'Card'::hostel.payment_mode, 'Net_Banking'::hostel.payment_mode])) OR (gateway_ref IS NOT NULL)`),
	check("fee_receipt_check1", sql`(payment_mode <> 'Cash'::hostel.payment_mode) OR (collected_by IS NOT NULL)`),
]);

export const meter_readingInHostel = hostel.table("meter_reading", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	reading_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.meter_reading_reading_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	meter_id: bigint({ mode: "number" }).notNull(),
	reading_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	reading_kwh: numeric({ precision: 12, scale:  2 }).notNull(),
	source: reading_sourceInHostel().notNull(),
	read_by: varchar({ length: 20 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	handover_id: bigint({ mode: "number" }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_meter_reading_latest").using("btree", table.meter_id.asc().nullsLast().op("timestamptz_ops"), table.reading_at.desc().nullsFirst().op("int8_ops")),
	foreignKey({
			columns: [table.handover_id],
			foreignColumns: [room_handoverInHostel.handover_id],
			name: "meter_reading_handover_id_fkey"
		}),
	foreignKey({
			columns: [table.meter_id],
			foreignColumns: [room_meterInHostel.meter_id],
			name: "meter_reading_meter_id_fkey"
		}),
	foreignKey({
			columns: [table.read_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "meter_reading_read_by_fkey"
		}),
	unique("meter_reading_meter_id_reading_at_key").on(table.meter_id, table.reading_at),
	check("meter_reading_check", sql`(source <> 'Manual'::hostel.reading_source) OR (read_by IS NOT NULL)`),
	check("meter_reading_reading_kwh_check", sql`reading_kwh >= (0)::numeric`),
]);

export const meter_rechargeInHostel = hostel.table("meter_recharge", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	recharge_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.meter_recharge_recharge_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	meter_id: bigint({ mode: "number" }).notNull(),
	student_id: varchar({ length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	receipt_id: bigint({ mode: "number" }).notNull(),
	units_credited: numeric({ precision: 10, scale:  2 }).notNull(),
	pushed_to_meter: boolean().default(false).notNull(),
	push_ref: varchar({ length: 80 }),
	push_attempts: smallint().default(0).notNull(),
	status: recharge_statusInHostel().default('Paid').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.meter_id],
			foreignColumns: [room_meterInHostel.meter_id],
			name: "meter_recharge_meter_id_fkey"
		}),
	foreignKey({
			columns: [table.receipt_id],
			foreignColumns: [fee_receiptInHostel.receipt_id],
			name: "meter_recharge_receipt_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "meter_recharge_student_id_fkey"
		}),
	unique("meter_recharge_receipt_id_key").on(table.receipt_id),
]);

export const tracking_consentInHostel = hostel.table("tracking_consent", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	consent_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.tracking_consent_consent_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	student_id: varchar({ length: 20 }).notNull(),
	given_by: consent_given_byInHostel().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	contact_id: bigint({ mode: "number" }),
	policy_version: varchar({ length: 20 }).notNull(),
	given_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	withdrawn_on: timestamp({ withTimezone: true, mode: 'string' }),
	recorded_by: varchar({ length: 20 }),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_consent_student_current").using("btree", table.student_id.asc().nullsLast().op("text_ops"), table.given_on.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.contact_id],
			foreignColumns: [student_contactInHostel.contact_id],
			name: "tracking_consent_contact_id_fkey"
		}),
	foreignKey({
			columns: [table.recorded_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "tracking_consent_recorded_by_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "tracking_consent_student_id_fkey"
		}),
	check("tracking_consent_check", sql`(given_by <> 'Parent'::hostel.consent_given_by) OR (contact_id IS NOT NULL)`),
	check("tracking_consent_check1", sql`(withdrawn_on IS NULL) OR (withdrawn_on >= given_on)`),
]);

export const capture_pointInHostel = hostel.table("capture_point", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	point_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.capture_point_point_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	point_name: varchar({ length: 120 }).notNull(),
	point_type: point_typeInHostel().notNull(),
	facility_id: varchar({ length: 30 }).notNull(),
	zone_id: varchar({ length: 30 }),
	space_id: varchar({ length: 30 }),
	device_type: device_typeInHostel().notNull(),
	device_ref: varchar({ length: 80 }),
	status: device_statusInHostel().default('Active').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [facilityInInfra.facility_id],
			name: "capture_point_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "capture_point_space_id_fkey"
		}),
	foreignKey({
			columns: [table.zone_id],
			foreignColumns: [zoneInInfra.zone_id],
			name: "capture_point_zone_id_fkey"
		}),
]);

export const student_current_statusInHostel = hostel.table("student_current_status", {
	student_id: varchar({ length: 20 }).primaryKey().notNull(),
	current_status: current_statusInHostel().default('Not_Seen').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	last_event_id: bigint({ mode: "number" }),
	last_event_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ix_current_status").using("btree", table.current_status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "student_current_status_student_id_fkey"
		}),
]);

export const hostel_alertInHostel = hostel.table("hostel_alert", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	alert_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.hostel_alert_alert_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	alert_type: alert_typeInHostel().notNull(),
	student_id: varchar({ length: 20 }),
	facility_id: varchar({ length: 30 }).notNull(),
	related_type: varchar({ length: 40 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	related_id: bigint({ mode: "number" }),
	raised_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	severity: severityInHostel().default('Warning').notNull(),
	assigned_to: varchar({ length: 20 }),
	parent_informed: boolean().default(false).notNull(),
	acknowledged_at: timestamp({ withTimezone: true, mode: 'string' }),
	action_taken: text(),
	status: alert_statusInHostel().default('Open').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_alert_open").using("btree", table.facility_id.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops"), table.raised_at.desc().nullsFirst().op("text_ops")).where(sql`(status <> 'Closed'::hostel.alert_status)`),
	foreignKey({
			columns: [table.assigned_to],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "hostel_alert_assigned_to_fkey"
		}),
	foreignKey({
			columns: [table.facility_id],
			foreignColumns: [hostel_profileInHostel.facility_id],
			name: "hostel_alert_facility_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "hostel_alert_student_id_fkey"
		}),
	check("hostel_alert_check", sql`(status <> 'Closed'::hostel.alert_status) OR (action_taken IS NOT NULL)`),
]);

export const location_access_logInHostel = hostel.table("location_access_log", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	log_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.location_access_log_log_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	viewer_staff_id: varchar({ length: 20 }).notNull(),
	student_id: varchar({ length: 20 }).notNull(),
	viewed_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	purpose: access_purposeInHostel().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	alert_id: bigint({ mode: "number" }),
}, (table) => [
	index("ix_location_access_student").using("btree", table.student_id.asc().nullsLast().op("text_ops"), table.viewed_at.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.alert_id],
			foreignColumns: [hostel_alertInHostel.alert_id],
			name: "location_access_log_alert_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "location_access_log_student_id_fkey"
		}),
	foreignKey({
			columns: [table.viewer_staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "location_access_log_viewer_staff_id_fkey"
		}),
]);

export const sick_leaveInHostel = hostel.table("sick_leave", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sick_leave_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.sick_leave_sick_leave_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	student_id: varchar({ length: 20 }).notNull(),
	illness_details: text().notNull(),
	from_date: date().notNull(),
	to_date: date().notNull(),
	applied_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	medical_doc_id: uuid(),
	visited_by: varchar({ length: 20 }),
	visited_at: timestamp({ withTimezone: true, mode: 'string' }),
	visit_remarks: text(),
	room_meals_required: boolean().default(false).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	extended_from_id: bigint({ mode: "number" }),
	approved_by: varchar({ length: 20 }),
	closed_on: date(),
	status: sick_leave_statusInHostel().default('Applied').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_sick_leave_active").using("btree", table.from_date.asc().nullsLast().op("date_ops"), table.to_date.asc().nullsLast().op("date_ops")).where(sql`(status = 'Approved'::hostel.sick_leave_status)`),
	index("ix_sick_leave_student").using("btree", table.student_id.asc().nullsLast().op("date_ops"), table.from_date.desc().nullsFirst().op("date_ops")),
	foreignKey({
			columns: [table.approved_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "sick_leave_approved_by_fkey"
		}),
	foreignKey({
			columns: [table.extended_from_id],
			foreignColumns: [table.sick_leave_id],
			name: "sick_leave_extended_from_id_fkey"
		}),
	foreignKey({
			columns: [table.medical_doc_id],
			foreignColumns: [documentInShared.doc_id],
			name: "sick_leave_medical_doc_id_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "sick_leave_student_id_fkey"
		}),
	foreignKey({
			columns: [table.visited_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "sick_leave_visited_by_fkey"
		}),
	check("sick_leave_check", sql`to_date >= from_date`),
	check("sick_leave_check1", sql`(status = ANY (ARRAY['Applied'::hostel.sick_leave_status, 'Rejected'::hostel.sick_leave_status])) OR ((visited_by IS NOT NULL) AND (visited_at IS NOT NULL) AND (visit_remarks IS NOT NULL))`),
	check("sick_leave_check2", sql`(status <> 'Approved'::hostel.sick_leave_status) OR (approved_by IS NOT NULL)`),
	check("sick_leave_check3", sql`(status <> 'Closed'::hostel.sick_leave_status) OR (closed_on IS NOT NULL)`),
]);

export const outpassInHostel = hostel.table("outpass", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	outpass_id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({ name: "hostel.outpass_outpass_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	outpass_no: varchar({ length: 20 }),
	student_id: varchar({ length: 20 }).notNull(),
	reason: text().notNull(),
	destination: varchar({ length: 200 }).notNull(),
	leave_from: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	return_by: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	outing_category: outing_categoryInHostel().notNull(),
	levels_required: smallint().notNull(),
	contact_during_leave: varchar({ length: 15 }).notNull(),
	applied_on: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	qr_token: varchar({ length: 64 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	actual_out_event_id: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	actual_in_event_id: bigint({ mode: "number" }),
	actual_out_at: timestamp({ withTimezone: true, mode: 'string' }),
	actual_in_at: timestamp({ withTimezone: true, mode: 'string' }),
	late_by_minutes: integer(),
	status: outpass_statusInHostel().default('Applied').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	index("ix_outpass_open").using("btree", table.status.asc().nullsLast().op("enum_ops")).where(sql`(status = ANY (ARRAY['Applied'::hostel.outpass_status, 'Parent_Recommended'::hostel.outpass_status, 'L1_Approved'::hostel.outpass_status, 'L2_Approved'::hostel.outpass_status, 'Approved'::hostel.outpass_status, 'Out'::hostel.outpass_status, 'Overdue'::hostel.outpass_status]))`),
	index("ix_outpass_student").using("btree", table.student_id.asc().nullsLast().op("text_ops"), table.applied_on.desc().nullsFirst().op("timestamptz_ops")),
	uniqueIndex("ux_outpass_in_progress").using("btree", table.student_id.asc().nullsLast().op("text_ops")).where(sql`(status = ANY (ARRAY['Applied'::hostel.outpass_status, 'Parent_Recommended'::hostel.outpass_status, 'L1_Approved'::hostel.outpass_status, 'L2_Approved'::hostel.outpass_status, 'Approved'::hostel.outpass_status, 'Out'::hostel.outpass_status, 'Overdue'::hostel.outpass_status]))`),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "outpass_student_id_fkey"
		}),
	unique("outpass_outpass_no_key").on(table.outpass_no),
	unique("outpass_qr_token_key").on(table.qr_token),
	check("ck_outpass_no_present", sql`outpass_no IS NOT NULL)) NOT VALID`),
	check("outpass_check", sql`return_by > leave_from`),
	check("outpass_check1", sql`(status <> ALL (ARRAY['Approved'::hostel.outpass_status, 'Out'::hostel.outpass_status, 'Returned'::hostel.outpass_status, 'Overdue'::hostel.outpass_status])) OR (qr_token IS NOT NULL)`),
]);

export const vendor_categoryInPortal = portal.table("vendor_category", {
	vendor_id: varchar({ length: 20 }).notNull(),
	category_code: varchar({ length: 10 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.category_code],
			foreignColumns: [categoryInPortal.category_code],
			name: "vendor_category_category_code_fkey"
		}),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "vendor_category_vendor_id_fkey"
		}),
	primaryKey({ columns: [table.category_code, table.vendor_id], name: "vendor_category_pkey"}),
]);

export const vendor_tagInPortal = portal.table("vendor_tag", {
	vendor_id: varchar({ length: 20 }).notNull(),
	tag: varchar({ length: 40 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "vendor_tag_vendor_id_fkey"
		}),
	primaryKey({ columns: [table.tag, table.vendor_id], name: "vendor_tag_pkey"}),
]);

export const material_aliasInPortal = portal.table("material_alias", {
	sku: varchar({ length: 30 }).notNull(),
	alias: varchar({ length: 80 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "material_alias_sku_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.alias, table.sku], name: "material_alias_pkey"}),
]);

export const bom_componentInPortal = portal.table("bom_component", {
	parent_sku: varchar({ length: 30 }).notNull(),
	component_sku: varchar({ length: 30 }).notNull(),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.component_sku],
			foreignColumns: [materialInPortal.sku],
			name: "bom_component_component_sku_fkey"
		}),
	foreignKey({
			columns: [table.parent_sku],
			foreignColumns: [materialInPortal.sku],
			name: "bom_component_parent_sku_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.component_sku, table.parent_sku], name: "bom_component_pkey"}),
]);

export const stock_entry_findingInPortal = portal.table("stock_entry_finding", {
	entry_id: varchar({ length: 20 }).notNull(),
	finding_no: smallint().notNull(),
	finding: varchar({ length: 200 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.entry_id],
			foreignColumns: [stock_entryInPortal.entry_id],
			name: "stock_entry_finding_entry_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.entry_id, table.finding_no], name: "stock_entry_finding_pkey"}),
]);

export const room_standard_inventoryInHostel = hostel.table("room_standard_inventory", {
	room_type_id: smallint().notNull(),
	sku: varchar({ length: 30 }).notNull(),
	qty_per_room: smallint().default(1).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.room_type_id],
			foreignColumns: [room_typeInHostel.room_type_id],
			name: "room_standard_inventory_room_type_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "room_standard_inventory_sku_fkey"
		}),
	primaryKey({ columns: [table.room_type_id, table.sku], name: "room_standard_inventory_pkey"}),
]);

export const doc_counterInHostel = hostel.table("doc_counter", {
	prefix: varchar({ length: 5 }).notNull(),
	year: smallint().notNull(),
	last_seq: integer().default(0).notNull(),
}, (table) => [
	primaryKey({ columns: [table.prefix, table.year], name: "doc_counter_pkey"}),
]);

export const material_standard_rateInPortal = portal.table("material_standard_rate", {
	sku: varchar({ length: 30 }).notNull(),
	applicable_from: date().notNull(),
	buying_rate: numeric({ precision: 14, scale:  2 }),
	selling_rate: numeric({ precision: 14, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "material_standard_rate_sku_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.applicable_from, table.sku], name: "material_standard_rate_pkey"}),
]);

export const opening_stockInPortal = portal.table("opening_stock", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batch_id: bigint({ mode: "number" }).notNull(),
	location_code: varchar({ length: 10 }).notNull(),
	opening_qty: numeric({ precision: 14, scale:  3 }).notNull(),
	opening_rate: numeric({ precision: 14, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.batch_id],
			foreignColumns: [batchInPortal.batch_id],
			name: "opening_stock_batch_id_fkey"
		}),
	foreignKey({
			columns: [table.location_code],
			foreignColumns: [locationInPortal.location_code],
			name: "opening_stock_location_code_fkey"
		}),
	primaryKey({ columns: [table.batch_id, table.location_code], name: "opening_stock_pkey"}),
]);

export const stock_reservationInPortal = portal.table("stock_reservation", {
	indent_id: varchar({ length: 20 }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	bin_code: varchar({ length: 20 }).notNull(),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bin_code],
			foreignColumns: [binInPortal.bin_code],
			name: "stock_reservation_bin_code_fkey"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "stock_reservation_indent_id_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "stock_reservation_sku_fkey"
		}),
	primaryKey({ columns: [table.bin_code, table.indent_id, table.sku], name: "stock_reservation_pkey"}),
]);

export const rfq_vendorInPortal = portal.table("rfq_vendor", {
	rfq_id: varchar({ length: 20 }).notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	sent_date: date(),
	response_status: rfq_responseInPortal().default('Invited').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.rfq_id],
			foreignColumns: [rfqInPortal.rfq_id],
			name: "rfq_vendor_rfq_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "rfq_vendor_vendor_id_fkey"
		}),
	primaryKey({ columns: [table.rfq_id, table.vendor_id], name: "rfq_vendor_pkey"}),
]);

export const equipment_coverInPortal = portal.table("equipment_cover", {
	sku: varchar({ length: 30 }).notNull(),
	location_code: varchar({ length: 10 }).notNull(),
	amc_expiry: date(),
	warranty_expiry: date(),
}, (table) => [
	foreignKey({
			columns: [table.location_code],
			foreignColumns: [locationInPortal.location_code],
			name: "equipment_cover_location_code_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "equipment_cover_sku_fkey"
		}),
	primaryKey({ columns: [table.location_code, table.sku], name: "equipment_cover_pkey"}),
]);

export const report_visibilityInShared = shared.table("report_visibility", {
	report_code: varchar({ length: 40 }).notNull(),
	role_code: varchar({ length: 30 }).notNull(),
	scope: visibility_scopeInShared().notNull(),
	status: active_statusInShared().default('Active').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.role_code],
			foreignColumns: [roleInPortal.role_code],
			name: "report_visibility_role_code_fkey"
		}),
	primaryKey({ columns: [table.report_code, table.role_code], name: "report_visibility_pkey"}),
]);

export const deployment_eventInPortal = portal.table("deployment_event", {
	deployment_id: varchar({ length: 20 }).notNull(),
	event_no: smallint().notNull(),
	actor_id: integer(),
	action: varchar({ length: 120 }).notNull(),
	occurred_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.actor_id],
			foreignColumns: [app_userInPortal.user_id],
			name: "deployment_event_actor_id_fkey"
		}),
	foreignKey({
			columns: [table.deployment_id],
			foreignColumns: [deploymentInPortal.deployment_id],
			name: "deployment_event_deployment_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.deployment_id, table.event_no], name: "deployment_event_pkey"}),
]);

export const vendor_evaluation_criteriaInPortal = portal.table("vendor_evaluation_criteria", {
	criteria_set_id: varchar({ length: 20 }).notNull(),
	criteria_id: varchar({ length: 20 }).notNull(),
	criteria_name: varchar({ length: 60 }).notNull(),
	weightage_pct: numeric({ precision: 5, scale:  2 }).notNull(),
	scoring_method: scoring_methodInPortal().notNull(),
	is_mandatory: boolean().default(false).notNull(),
}, (table) => [
	primaryKey({ columns: [table.criteria_id, table.criteria_set_id], name: "vendor_evaluation_criteria_pkey"}),
]);

export const stock_check_lineInPortal = portal.table("stock_check_line", {
	indent_id: varchar({ length: 20 }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	on_hand_at_check: numeric({ precision: 14, scale:  3 }).notNull(),
	available_at_check: numeric({ precision: 14, scale:  3 }).notNull(),
	issue_qty: numeric({ precision: 14, scale:  3 }).notNull(),
	remark: varchar({ length: 160 }),
}, (table) => [
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [stock_checkInPortal.indent_id],
			name: "stock_check_line_indent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "stock_check_line_sku_fkey"
		}),
	primaryKey({ columns: [table.indent_id, table.sku], name: "stock_check_line_pkey"}),
]);

export const amc_renewal_decisionInPortal = portal.table("amc_renewal_decision", {
	renewal_id: varchar({ length: 20 }).notNull(),
	decision_no: smallint().notNull(),
	actor_id: integer(),
	role_code: varchar({ length: 30 }),
	action: varchar({ length: 120 }).notNull(),
	occurred_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.actor_id],
			foreignColumns: [app_userInPortal.user_id],
			name: "amc_renewal_decision_actor_id_fkey"
		}),
	foreignKey({
			columns: [table.renewal_id],
			foreignColumns: [amc_renewalInPortal.renewal_id],
			name: "amc_renewal_decision_renewal_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.role_code],
			foreignColumns: [roleInPortal.role_code],
			name: "amc_renewal_decision_role_code_fkey"
		}),
	primaryKey({ columns: [table.decision_no, table.renewal_id], name: "amc_renewal_decision_pkey"}),
]);

export const room_handover_lineInHostel = hostel.table("room_handover_line", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	handover_id: bigint({ mode: "number" }).notNull(),
	line_no: smallint().notNull(),
	asset_id: varchar({ length: 40 }).notNull(),
	condition: item_conditionInHostel().notNull(),
	damage_amount: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	remarks: text(),
}, (table) => [
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "room_handover_line_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.handover_id],
			foreignColumns: [room_handoverInHostel.handover_id],
			name: "room_handover_line_handover_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.handover_id, table.line_no], name: "room_handover_line_pkey"}),
	check("room_handover_line_check", sql`(damage_amount = (0)::numeric) OR (condition = ANY (ARRAY['Damaged'::hostel.item_condition, 'Missing'::hostel.item_condition]))`),
	check("room_handover_line_damage_amount_check", sql`damage_amount >= (0)::numeric`),
]);

export const user_roleInPortal = portal.table("user_role", {
	user_id: integer().notNull(),
	role_code: varchar({ length: 30 }).notNull(),
	scope_dept: varchar({ length: 20 }).notNull(),
	granted_on: date().default(sql`CURRENT_DATE`).notNull(),
	approval_ref: varchar({ length: 80 }),
	granted_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.role_code],
			foreignColumns: [roleInPortal.role_code],
			name: "user_role_role_code_fkey"
		}),
	foreignKey({
			columns: [table.scope_dept],
			foreignColumns: [departmentInRef.dept_code],
			name: "user_role_scope_dept_fkey"
		}),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [app_userInPortal.user_id],
			name: "user_role_user_id_fkey"
		}),
	primaryKey({ columns: [table.role_code, table.scope_dept, table.user_id], name: "user_role_pkey"}),
]);

export const indent_eventInPortal = portal.table("indent_event", {
	indent_id: varchar({ length: 20 }).notNull(),
	event_no: smallint().notNull(),
	actor_id: integer(),
	role_code: varchar({ length: 30 }),
	action: varchar({ length: 120 }).notNull(),
	note: text(),
	occurred_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.actor_id],
			foreignColumns: [app_userInPortal.user_id],
			name: "indent_event_actor_id_fkey"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "indent_event_indent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.role_code],
			foreignColumns: [roleInPortal.role_code],
			name: "indent_event_role_code_fkey"
		}),
	primaryKey({ columns: [table.event_no, table.indent_id], name: "indent_event_pkey"}),
]);

export const new_request_eventInPortal = portal.table("new_request_event", {
	request_id: varchar({ length: 20 }).notNull(),
	event_no: smallint().notNull(),
	actor_id: integer(),
	role_code: varchar({ length: 30 }),
	action: varchar({ length: 120 }).notNull(),
	note: text(),
	occurred_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.actor_id],
			foreignColumns: [app_userInPortal.user_id],
			name: "new_request_event_actor_id_fkey"
		}),
	foreignKey({
			columns: [table.request_id],
			foreignColumns: [new_requestInPortal.request_id],
			name: "new_request_event_request_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.role_code],
			foreignColumns: [roleInPortal.role_code],
			name: "new_request_event_role_code_fkey"
		}),
	primaryKey({ columns: [table.event_no, table.request_id], name: "new_request_event_pkey"}),
]);

export const po_eventInPortal = portal.table("po_event", {
	po_id: integer().notNull(),
	event_no: smallint().notNull(),
	actor_id: integer(),
	role_code: varchar({ length: 30 }),
	action: varchar({ length: 120 }).notNull(),
	note: text(),
	occurred_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.actor_id],
			foreignColumns: [app_userInPortal.user_id],
			name: "po_event_actor_id_fkey"
		}),
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "po_event_po_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.role_code],
			foreignColumns: [roleInPortal.role_code],
			name: "po_event_role_code_fkey"
		}),
	primaryKey({ columns: [table.event_no, table.po_id], name: "po_event_pkey"}),
]);

export const material_issue_lineInPortal = portal.table("material_issue_line", {
	issue_id: varchar({ length: 20 }).notNull(),
	sku: varchar({ length: 30 }).notNull(),
	bin_code: varchar({ length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batch_id: bigint({ mode: "number" }),
	serial_no: varchar({ length: 80 }),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
	unit_cost: numeric({ precision: 14, scale:  2 }),
	total_cost: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`(qty * COALESCE(unit_cost, (0)::numeric))`),
	asset_id: varchar({ length: 40 }),
}, (table) => [
	foreignKey({
			columns: [table.asset_id],
			foreignColumns: [asset_masterInInfra.asset_id],
			name: "material_issue_line_asset_id_fkey"
		}),
	foreignKey({
			columns: [table.batch_id],
			foreignColumns: [batchInPortal.batch_id],
			name: "material_issue_line_batch_id_fkey"
		}),
	foreignKey({
			columns: [table.bin_code],
			foreignColumns: [binInPortal.bin_code],
			name: "material_issue_line_bin_code_fkey"
		}),
	foreignKey({
			columns: [table.issue_id],
			foreignColumns: [material_issueInPortal.issue_id],
			name: "material_issue_line_issue_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "material_issue_line_sku_fkey"
		}),
	primaryKey({ columns: [table.bin_code, table.issue_id, table.sku], name: "material_issue_line_pkey"}),
]);

export const meter_monthly_usageInHostel = hostel.table("meter_monthly_usage", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	meter_id: bigint({ mode: "number" }).notNull(),
	usage_month: date().notNull(),
	opening_reading: numeric({ precision: 12, scale:  2 }).notNull(),
	closing_reading: numeric({ precision: 12, scale:  2 }).notNull(),
	units_used: numeric({ precision: 12, scale:  2 }).generatedAlwaysAs(sql`(closing_reading - opening_reading)`),
	included_units: numeric({ precision: 10, scale:  2 }).notNull(),
	recharged_units: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	excess_units: numeric({ precision: 12, scale:  2 }).generatedAlwaysAs(sql`GREATEST(((closing_reading - opening_reading) - included_units), (0)::numeric)`),
	computed_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.meter_id],
			foreignColumns: [room_meterInHostel.meter_id],
			name: "meter_monthly_usage_meter_id_fkey"
		}),
	primaryKey({ columns: [table.meter_id, table.usage_month], name: "meter_monthly_usage_pkey"}),
	check("meter_monthly_usage_check", sql`closing_reading >= opening_reading`),
]);

export const movement_event_defaultInHostel = hostel.table("movement_event_default", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	event_id: bigint({ mode: "number" }).generatedAlwaysAsIdentity(),
	student_id: varchar({ length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	point_id: bigint({ mode: "number" }).notNull(),
	direction: directionInHostel().notNull(),
	event_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	source: event_sourceInHostel().notNull(),
	match_confidence: numeric({ precision: 5, scale:  2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	outpass_id: bigint({ mode: "number" }),
	recorded_by: varchar({ length: 20 }),
}, (table) => [
	index("movement_event_default_student_id_event_at_idx").using("btree", table.student_id.asc().nullsLast().op("text_ops"), table.event_at.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.outpass_id],
			foreignColumns: [outpassInHostel.outpass_id],
			name: "fk_movement_outpass"
		}),
	foreignKey({
			columns: [table.point_id],
			foreignColumns: [capture_pointInHostel.point_id],
			name: "movement_event_point_id_fkey"
		}),
	foreignKey({
			columns: [table.recorded_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "movement_event_recorded_by_fkey"
		}),
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "movement_event_student_id_fkey"
		}),
	primaryKey({ columns: [table.event_at, table.event_id], name: "movement_event_default_pkey"}),
	check("movement_event_check", sql`(source <> 'Camera'::hostel.event_source) OR (match_confidence IS NOT NULL)`),
	check("movement_event_check1", sql`(source <> 'Manual'::hostel.event_source) OR (recorded_by IS NOT NULL)`),
]);

export const staff_addressInRef = ref.table("staff_address", {
	staff_id: varchar({ length: 20 }).notNull(),
	address_type: address_typeInRef().notNull(),
	door_no: varchar({ length: 60 }),
	street: varchar({ length: 120 }),
	landmark: varchar({ length: 120 }),
	city: varchar({ length: 80 }),
	district: varchar({ length: 80 }),
	state: varchar({ length: 80 }),
	country: varchar({ length: 60 }).default('India'),
	pincode: varchar({ length: 10 }),
}, (table) => [
	foreignKey({
			columns: [table.staff_id],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "staff_address_staff_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.address_type, table.staff_id], name: "staff_address_pkey"}),
]);

export const sick_meal_deliveryInHostel = hostel.table("sick_meal_delivery", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sick_leave_id: bigint({ mode: "number" }).notNull(),
	meal_date: date().notNull(),
	slot: meal_slotInHostel().notNull(),
	delivered_by: varchar({ length: 20 }),
	delivered_at: timestamp({ withTimezone: true, mode: 'string' }),
	status: delivery_statusInHostel().default('Pending').notNull(),
	created_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	created_by: varchar({ length: 20 }),
	updated_at: timestamp({ withTimezone: true, mode: 'string' }),
	updated_by: varchar({ length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.delivered_by],
			foreignColumns: [staff_masterInRef.staff_id],
			name: "sick_meal_delivery_delivered_by_fkey"
		}),
	foreignKey({
			columns: [table.sick_leave_id],
			foreignColumns: [sick_leaveInHostel.sick_leave_id],
			name: "sick_meal_delivery_sick_leave_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.meal_date, table.sick_leave_id, table.slot], name: "sick_meal_delivery_pkey"}),
	check("sick_meal_delivery_check", sql`(status <> 'Delivered'::hostel.delivery_status) OR ((delivered_by IS NOT NULL) AND (delivered_at IS NOT NULL))`),
]);

export const student_addressInRef = ref.table("student_address", {
	student_id: varchar({ length: 20 }).notNull(),
	address_type: address_typeInRef().default('Permanent').notNull(),
	seq_no: smallint().default(1).notNull(),
	hno: varchar({ length: 80 }),
	street: varchar({ length: 120 }),
	landmark: varchar({ length: 160 }),
	district: varchar({ length: 80 }),
	state: varchar({ length: 80 }),
	city: varchar({ length: 80 }),
	country: varchar({ length: 60 }).default('India'),
	pincode: varchar({ length: 10 }),
}, (table) => [
	foreignKey({
			columns: [table.student_id],
			foreignColumns: [student_masterInRef.student_id],
			name: "student_address_student_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.address_type, table.seq_no, table.student_id], name: "student_address_pkey"}),
]);

export const stock_sheet_lineInPortal = portal.table("stock_sheet_line", {
	sheet_id: integer().notNull(),
	line_no: integer().notNull(),
	sl_no: varchar({ length: 10 }),
	material_name: varchar({ length: 160 }).notNull(),
	make: varchar({ length: 80 }),
	unit: varchar({ length: 20 }),
	qty_text: varchar({ length: 40 }),
	qty_value: numeric({ precision: 14, scale:  3 }),
	qty_basis: qty_basisInPortal().default('as_written').notNull(),
	remarks: text(),
	sku: varchar({ length: 30 }),
}, (table) => [
	foreignKey({
			columns: [table.sheet_id],
			foreignColumns: [stock_sheetInPortal.sheet_id],
			name: "stock_sheet_line_sheet_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "stock_sheet_line_sku_fkey"
		}),
	primaryKey({ columns: [table.line_no, table.sheet_id], name: "stock_sheet_line_pkey"}),
]);

export const audit_log_defaultInShared = shared.table("audit_log_default", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	audit_id: bigint({ mode: "number" }).generatedAlwaysAsIdentity(),
	occurred_at: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	kind: varchar({ length: 40 }).notNull(),
	outcome: varchar({ length: 60 }).notNull(),
	actor: varchar({ length: 40 }),
	role_code: varchar({ length: 30 }),
	table_name: varchar({ length: 80 }),
	row_key: varchar({ length: 80 }),
	detail: jsonb(),
	prev_hash: char({ length: 64 }),
	hash: char({ length: 64 }),
}, (table) => [
	primaryKey({ columns: [table.audit_id, table.occurred_at], name: "audit_log_default_pkey"}),
]);

export const stockInPortal = portal.table("stock", {
	sku: varchar({ length: 30 }).notNull(),
	bin_code: varchar({ length: 20 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	batch_id: bigint({ mode: "number" }).notNull(),
	qty: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_reserved: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_available: numeric({ precision: 14, scale:  3 }).generatedAlwaysAs(sql`(qty - qty_reserved)`),
	qty_on_order: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	avg_unit_cost: numeric({ precision: 14, scale:  2 }),
	stock_value: numeric({ precision: 16, scale:  2 }).generatedAlwaysAs(sql`(qty * COALESCE(avg_unit_cost, (0)::numeric))`),
	last_receipt_date: date(),
	last_issue_date: date(),
	counted_on: date(),
}, (table) => [
	foreignKey({
			columns: [table.batch_id],
			foreignColumns: [batchInPortal.batch_id],
			name: "stock_batch_id_fkey"
		}),
	foreignKey({
			columns: [table.bin_code],
			foreignColumns: [binInPortal.bin_code],
			name: "stock_bin_code_fkey"
		}),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "stock_sku_fkey"
		}),
	primaryKey({ columns: [table.batch_id, table.bin_code, table.sku], name: "stock_pkey"}),
]);

export const indent_lineInPortal = portal.table("indent_line", {
	indent_id: varchar({ length: 20 }).notNull(),
	sku: varchar({ length: 30 }),
	item_description: varchar({ length: 200 }),
	specification: text(),
	uom: varchar({ length: 10 }),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
	qty_approved: numeric({ precision: 14, scale:  3 }),
	unit_price_at_indent: numeric({ precision: 14, scale:  2 }),
	qty_available_substore: numeric({ precision: 14, scale:  3 }),
	qty_available_central: numeric({ precision: 14, scale:  3 }),
	fulfilment_source: fulfilment_sourceInPortal(),
	qty_issued: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_to_purchase: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pr_line_id: bigint({ mode: "number" }),
	line_status: indent_line_statusInPortal().default('Pending').notNull(),
	line_no: smallint().default(1).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.pr_line_id],
			foreignColumns: [pr_lineInPortal.pr_line_id],
			name: "fk_indent_line_pr"
		}),
	foreignKey({
			columns: [table.indent_id],
			foreignColumns: [indentInPortal.indent_id],
			name: "indent_line_indent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "indent_line_sku_fkey"
		}),
	foreignKey({
			columns: [table.uom],
			foreignColumns: [unit_of_measureInPortal.uom],
			name: "indent_line_uom_fkey"
		}),
	primaryKey({ columns: [table.indent_id, table.line_no], name: "indent_line_pkey"}),
]);

export const rfq_bidInPortal = portal.table("rfq_bid", {
	rfq_id: varchar({ length: 20 }).notNull(),
	vendor_id: varchar({ length: 20 }).notNull(),
	quotation_no: varchar({ length: 40 }),
	quotation_date: date(),
	validity_date: date(),
	offered_brand_model: varchar({ length: 120 }),
	spec_compliance: spec_complianceInPortal(),
	quoted_qty: numeric({ precision: 14, scale:  3 }),
	unit_price: numeric({ precision: 14, scale:  2 }).notNull(),
	discount_pct: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	tax_pct: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	lead_days: smallint(),
	warranty_months: smallint(),
	payment_terms: varchar({ length: 120 }),
	freight_included: boolean().default(false).notNull(),
	installation_included: boolean().default(false).notNull(),
	attachment_doc_id: uuid(),
	status: bid_statusInPortal().default('Received').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.attachment_doc_id],
			foreignColumns: [documentInShared.doc_id],
			name: "fk_bid_doc"
		}),
	foreignKey({
			columns: [table.rfq_id],
			foreignColumns: [rfqInPortal.rfq_id],
			name: "rfq_bid_rfq_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.vendor_id],
			foreignColumns: [vendorInPortal.vendor_id],
			name: "rfq_bid_vendor_id_fkey"
		}),
	primaryKey({ columns: [table.rfq_id, table.vendor_id], name: "rfq_bid_pkey"}),
]);

export const po_lineInPortal = portal.table("po_line", {
	po_id: integer().notNull(),
	line_no: smallint().notNull(),
	sku: varchar({ length: 30 }).notNull(),
	description: varchar({ length: 200 }),
	brand_model: varchar({ length: 120 }),
	qty: numeric({ precision: 14, scale:  3 }).notNull(),
	uom: varchar({ length: 10 }),
	unit_price: numeric({ precision: 14, scale:  2 }).notNull(),
	discount_pct: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	cgst_pct: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	sgst_pct: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	igst_pct: numeric({ precision: 5, scale:  2 }).default('0').notNull(),
	qty_received: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_rejected: numeric({ precision: 14, scale:  3 }).default('0').notNull(),
	qty_pending: numeric({ precision: 14, scale:  3 }).generatedAlwaysAs(sql`(qty - qty_received)`),
	install_space_id: varchar({ length: 30 }),
	line_status: po_line_statusInPortal().default('Open').notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	po_line_id: bigint({ mode: "number" }).generatedAlwaysAsIdentity({ name: "portal.po_line_po_line_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
}, (table) => [
	foreignKey({
			columns: [table.install_space_id],
			foreignColumns: [spaceInInfra.space_id],
			name: "po_line_install_space_id_fkey"
		}),
	foreignKey({
			columns: [table.po_id],
			foreignColumns: [purchase_orderInPortal.po_id],
			name: "po_line_po_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sku],
			foreignColumns: [materialInPortal.sku],
			name: "po_line_sku_fkey"
		}),
	foreignKey({
			columns: [table.uom],
			foreignColumns: [unit_of_measureInPortal.uom],
			name: "po_line_uom_fkey"
		}),
	primaryKey({ columns: [table.line_no, table.po_id], name: "po_line_pkey"}),
	unique("po_line_po_line_id_key").on(table.po_line_id),
]);
export const v_po_totalInPortal = portal.view("v_po_total", {	po_id: integer(),
	sub_total: numeric(),
	tax_amount: numeric(),
	grand_total: numeric(),
}).as(sql`SELECT po_id, sum(round(qty * unit_price * (1::numeric - discount_pct / 100::numeric), 2)) AS sub_total, sum(round(qty * unit_price * (1::numeric - discount_pct / 100::numeric) * (cgst_pct + sgst_pct + igst_pct) / 100::numeric, 2)) AS tax_amount, sum(round(qty * unit_price * (1::numeric - discount_pct / 100::numeric) * (1::numeric + (cgst_pct + sgst_pct + igst_pct) / 100::numeric), 2)) AS grand_total FROM portal.po_line GROUP BY po_id`);

export const v_student_duesInHostel = hostel.view("v_student_dues", {	student_id: varchar({ length: 20 }),
	fee_head: fee_headInHostel(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	demands: bigint({ mode: "number" }),
	amount_due: numeric(),
	amount_paid: numeric(),
	balance: numeric(),
	earliest_due: date(),
}).as(sql`SELECT student_id, fee_head, count(*) AS demands, sum(amount_due) AS amount_due, sum(amount_paid) AS amount_paid, sum(amount_due - amount_paid) FILTER (WHERE status <> 'Waived'::hostel.demand_status) AS balance, min(due_date) FILTER (WHERE status = ANY (ARRAY['Pending'::hostel.demand_status, 'Part_Paid'::hostel.demand_status, 'Overdue'::hostel.demand_status])) AS earliest_due FROM hostel.fee_demand d GROUP BY student_id, fee_head`);

export const v_bedInHostel = hostel.view("v_bed", {	subspace_id: varchar({ length: 30 }),
	bed_code: varchar({ length: 30 }),
	bed_status: subspace_statusInInfra(),
	space_id: varchar({ length: 30 }),
	room_code: varchar({ length: 30 }),
	room_name: varchar({ length: 120 }),
	room_status: space_statusInInfra(),
	zone_id: varchar({ length: 30 }),
	floor_name: varchar({ length: 80 }),
	floor_no: smallint(),
	facility_id: varchar({ length: 30 }),
	hostel_name: varchar({ length: 120 }),
	hostel_code: varchar({ length: 10 }),
	hostel_gender: hostel_genderInHostel(),
	room_type_id: smallint(),
	type_name: varchar({ length: 60 }),
	sharing_count: smallint(),
	is_ac: boolean(),
	is_accessible: boolean(),
	reserved_for: reserved_forInHostel(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hostel_alloc_id: bigint({ mode: "number" }),
	occupant_type: occupant_typeInHostel(),
	student_id: varchar({ length: 20 }),
	staff_id: varchar({ length: 20 }),
	allocation_date: date(),
}).as(sql`SELECT ss.subspace_id, ss.subspace_code AS bed_code, ss.status AS bed_status, s.space_id, s.space_code AS room_code, s.space_name AS room_name, s.status AS room_status, z.zone_id, z.zone_name AS floor_name, z.sequence_no AS floor_no, f.facility_id, f.facility_name AS hostel_name, hp.hostel_code, hp.hostel_gender, rp.room_type_id, rt.type_name, rt.sharing_count, rt.is_ac, rp.is_accessible, rp.reserved_for, a.hostel_alloc_id, a.occupant_type, a.student_id, a.staff_id, a.allocation_date FROM infra.subspace ss JOIN infra.space s ON s.space_id::text = ss.space_id::text JOIN infra.zone z ON z.zone_id::text = s.zone_id::text JOIN infra.facility f ON f.facility_id::text = z.facility_id::text JOIN hostel.hostel_profile hp ON hp.facility_id::text = f.facility_id::text LEFT JOIN hostel.room_profile rp ON rp.space_id::text = s.space_id::text LEFT JOIN hostel.room_type rt ON rt.room_type_id = rp.room_type_id LEFT JOIN hostel.hostel_allocation a ON a.subspace_id::text = ss.subspace_id::text AND a.status = 'Active'::hostel.allocation_status WHERE ss.subspace_type = 'Bed'::infra.subspace_type AND s.space_category = 'Hostel_Room'::infra.space_category`);

export const v_vacancyInHostel = hostel.view("v_vacancy", {	facility_id: varchar({ length: 30 }),
	hostel_name: varchar({ length: 120 }),
	hostel_code: varchar({ length: 10 }),
	hostel_gender: hostel_genderInHostel(),
	room_type_id: smallint(),
	type_name: varchar({ length: 60 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	vacant_beds: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	held_beds: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	occupied_beds: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	total_beds: bigint({ mode: "number" }),
}).as(sql`SELECT facility_id, hostel_name, hostel_code, hostel_gender, room_type_id, type_name, count(*) FILTER (WHERE bed_status = 'Vacant'::infra.subspace_status AND room_status <> 'Under_Maintenance'::infra.space_status AND reserved_for = 'None'::hostel.reserved_for) AS vacant_beds, count(*) FILTER (WHERE bed_status = 'Held'::infra.subspace_status) AS held_beds, count(*) FILTER (WHERE bed_status = 'Occupied'::infra.subspace_status) AS occupied_beds, count(*) AS total_beds FROM hostel.v_bed GROUP BY facility_id, hostel_name, hostel_code, hostel_gender, room_type_id, type_name`);

export const v_registrationInHostel = hostel.view("v_registration", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	registration_id: bigint({ mode: "number" }),
	registration_no: varchar({ length: 20 }),
	student_id: varchar({ length: 20 }),
	full_name: varchar({ length: 160 }),
	gender: genderInRef(),
	programme: varchar({ length: 80 }),
	academic_year: varchar({ length: 9 }),
	facility_id: varchar({ length: 30 }),
	hostel_code: varchar({ length: 10 }),
	room_type_id: smallint(),
	type_name: varchar({ length: 60 }),
	status: registration_statusInHostel(),
	applied_on: timestamp({ withTimezone: true, mode: 'string' }),
	waitlist_no: integer(),
	registration_fee_status: demand_statusInHostel(),
	registration_fee: numeric({ precision: 12, scale:  2 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fee_plan_id: bigint({ mode: "number" }),
	plan_type: plan_typeInHostel(),
	plan_status: plan_statusInHostel(),
	plan_amount_due: numeric(),
	plan_amount_paid: numeric(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	offer_id: bigint({ mode: "number" }),
	subspace_id: varchar({ length: 30 }),
	student_decision: student_decisionInHostel(),
	hold_until: timestamp({ withTimezone: true, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	hostel_alloc_id: bigint({ mode: "number" }),
	allocation_date: date(),
	key_no: varchar({ length: 20 }),
}).as(sql`SELECT r.registration_id, r.registration_no, r.student_id, sm.full_name, sm.gender, sm.programme, r.academic_year, r.facility_id, hp.hostel_code, r.room_type_id, rt.type_name, r.status, r.applied_on, r.waitlist_no, rd.status AS registration_fee_status, rd.amount_due AS registration_fee, fp.fee_plan_id, fp.plan_type, fp.status AS plan_status, ( SELECT COALESCE(sum(d.amount_due), 0::numeric) AS "coalesce" FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_due, ( SELECT COALESCE(sum(d.amount_paid), 0::numeric) AS "coalesce" FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_paid, o.offer_id, o.subspace_id, o.student_decision, o.hold_until, a.hostel_alloc_id, a.allocation_date, a.key_no FROM hostel.hostel_registration r JOIN ref.student_master sm ON sm.student_id::text = r.student_id::text JOIN hostel.hostel_profile hp ON hp.facility_id::text = r.facility_id::text JOIN hostel.room_type rt ON rt.room_type_id = r.room_type_id LEFT JOIN hostel.fee_demand rd ON rd.demand_id = r.reg_demand_id LEFT JOIN hostel.fee_plan fp ON fp.registration_id = r.registration_id LEFT JOIN hostel.room_offer o ON o.registration_id = r.registration_id AND (o.student_decision = ANY (ARRAY['Pending'::hostel.student_decision, 'Accepted'::hostel.student_decision])) LEFT JOIN hostel.hostel_allocation a ON a.offer_id = o.offer_id`);

export const v_floors_without_wardenInHostel = hostel.view("v_floors_without_warden", {	facility_id: varchar({ length: 30 }),
	hostel_name: varchar({ length: 120 }),
	zone_id: varchar({ length: 30 }),
	floor_name: varchar({ length: 80 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	occupied_beds: bigint({ mode: "number" }),
}).as(sql`SELECT facility_id, hostel_name, zone_id, floor_name, count(*) AS occupied_beds FROM hostel.v_bed b WHERE bed_status = 'Occupied'::infra.subspace_status AND NOT (EXISTS ( SELECT 1 FROM hostel.staff_space_assignment a WHERE a.facility_id::text = b.facility_id::text AND a.zone_id::text = b.zone_id::text AND a.hostel_role::text = 'Floor_Warden'::text AND a.status = 'Active'::hostel.assignment_status)) GROUP BY facility_id, hostel_name, zone_id, floor_name`);

export const v_space_qr_pageInHostel = hostel.view("v_space_qr_page", {	qr_token: varchar({ length: 64 }),
	space_id: varchar({ length: 30 }),
	space_code: varchar({ length: 30 }),
	space_name: varchar({ length: 120 }),
	space_category: space_categoryInInfra(),
	zone_name: varchar({ length: 80 }),
	facility_name: varchar({ length: 120 }),
	hostel_role: varchar({ length: 30 }),
	full_name: varchar({ length: 200 }),
	mobile_no: varchar({ length: 15 }),
	shift: shiftInHostel(),
}).as(sql`SELECT q.qr_token, s.space_id, s.space_code, s.space_name, s.space_category, z.zone_name, f.facility_name, a.hostel_role, st.full_name, st.mobile_no, a.shift FROM hostel.space_qr q JOIN infra.space s ON s.space_id::text = q.space_id::text JOIN infra.zone z ON z.zone_id::text = s.zone_id::text JOIN infra.facility f ON f.facility_id::text = z.facility_id::text JOIN hostel.staff_space_assignment a ON a.facility_id::text = f.facility_id::text AND a.status = 'Active'::hostel.assignment_status AND a.show_on_qr AND (a.space_id::text = s.space_id::text OR a.space_id IS NULL AND (a.zone_id::text = z.zone_id::text OR a.zone_id IS NULL)) JOIN ref.staff_master st ON st.staff_id::text = a.staff_id::text WHERE q.status = 'Active'::hostel.qr_status`);

export const v_student_locationInHostel = hostel.view("v_student_location", {	student_id: varchar({ length: 20 }),
	full_name: varchar({ length: 160 }),
	gender: genderInRef(),
	programme: varchar({ length: 80 }),
	facility_id: varchar(),
	zone_id: varchar(),
	space_id: varchar(),
	subspace_id: varchar(),
	current_status: current_statusInHostel(),
	last_event_at: timestamp({ withTimezone: true, mode: 'string' }),
	last_point: varchar({ length: 120 }),
	last_direction: directionInHostel(),
}).as(sql`SELECT sm.student_id, sm.full_name, sm.gender, sm.programme, st.facility_id, st.zone_id, st.space_id, st.subspace_id, cs.current_status, cs.last_event_at, cp.point_name AS last_point, me.direction AS last_direction FROM ref.student_master sm JOIN LATERAL hostel.fn_student_stay(sm.student_id) st(hostel_alloc_id, subspace_id, space_id, zone_id, facility_id) ON true LEFT JOIN hostel.student_current_status cs ON cs.student_id::text = sm.student_id::text LEFT JOIN hostel.movement_event me ON me.event_id = cs.last_event_id AND me.event_at = cs.last_event_at LEFT JOIN hostel.capture_point cp ON cp.point_id = me.point_id WHERE sm.is_hosteller`);

export const v_mess_sick_listInHostel = hostel.view("v_mess_sick_list", {	meal_date: date(),
	slot: meal_slotInHostel(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sick_leave_id: bigint({ mode: "number" }),
	student_id: varchar({ length: 20 }),
	full_name: varchar({ length: 160 }),
	facility_id: varchar(),
	space_id: varchar(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	mess_id: bigint({ mode: "number" }),
	cuisine: cuisineInHostel(),
	status: delivery_statusInHostel(),
	delivered_by: varchar({ length: 20 }),
	delivered_at: timestamp({ withTimezone: true, mode: 'string' }),
}).as(sql`SELECT d.meal_date, d.slot, sl.sick_leave_id, sl.student_id, sm.full_name, st.facility_id, st.space_id, ms.mess_id, ms.cuisine, d.status, d.delivered_by, d.delivered_at FROM hostel.sick_meal_delivery d JOIN hostel.sick_leave sl ON sl.sick_leave_id = d.sick_leave_id AND sl.status = 'Approved'::hostel.sick_leave_status JOIN ref.student_master sm ON sm.student_id::text = sl.student_id::text LEFT JOIN LATERAL hostel.fn_student_stay(sl.student_id) st(hostel_alloc_id, subspace_id, space_id, zone_id, facility_id) ON true LEFT JOIN hostel.mess_subscription ms ON ms.student_id::text = sl.student_id::text AND ms.status = 'Active'::hostel.subscription_status`);

export const v_outpassInHostel = hostel.view("v_outpass", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	outpass_id: bigint({ mode: "number" }),
	outpass_no: varchar({ length: 20 }),
	student_id: varchar({ length: 20 }),
	full_name: varchar({ length: 160 }),
	facility_id: varchar(),
	zone_id: varchar(),
	reason: text(),
	destination: varchar({ length: 200 }),
	leave_from: timestamp({ withTimezone: true, mode: 'string' }),
	return_by: timestamp({ withTimezone: true, mode: 'string' }),
	outing_category: outing_categoryInHostel(),
	levels_required: smallint(),
	contact_during_leave: varchar({ length: 15 }),
	status: outpass_statusInHostel(),
	qr_token: varchar({ length: 64 }),
	actual_out_at: timestamp({ withTimezone: true, mode: 'string' }),
	actual_in_at: timestamp({ withTimezone: true, mode: 'string' }),
	late_by_minutes: integer(),
	applied_on: timestamp({ withTimezone: true, mode: 'string' }),
	steps: jsonb(),
}).as(sql`SELECT o.outpass_id, o.outpass_no, o.student_id, sm.full_name, st.facility_id, st.zone_id, o.reason, o.destination, o.leave_from, o.return_by, o.outing_category, o.levels_required, o.contact_during_leave, o.status, o.qr_token, o.actual_out_at, o.actual_in_at, o.late_by_minutes, o.applied_on, ( SELECT jsonb_agg(jsonb_build_object('level', s.level, 'role', s.approver_role, 'decision', s.decision, 'by', COALESCE(st_1.full_name, (((c.contact_name::text || ' ('::text) || c.relation) || ')'::text)::character varying), 'on', s.decided_on, 'remarks', s.remarks) ORDER BY s.level) AS jsonb_agg FROM shared.approval_step s LEFT JOIN ref.staff_master st_1 ON st_1.staff_id::text = s.acted_by::text LEFT JOIN hostel.student_contact c ON c.contact_id = s.acted_by_contact WHERE s.request_type = 'Outpass'::shared.request_type AND s.request_id = o.outpass_id) AS steps FROM hostel.outpass o JOIN ref.student_master sm ON sm.student_id::text = o.student_id::text LEFT JOIN LATERAL hostel.fn_student_stay(o.student_id) st(hostel_alloc_id, subspace_id, space_id, zone_id, facility_id) ON true`);

export const v_meter_positionInHostel = hostel.view("v_meter_position", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	meter_id: bigint({ mode: "number" }),
	meter_no: varchar({ length: 40 }),
	space_id: varchar({ length: 30 }),
	space_code: varchar({ length: 30 }),
	room_type_id: smallint(),
	last_reading: numeric({ precision: 12, scale:  2 }),
	last_reading_at: timestamp({ withTimezone: true, mode: 'string' }),
	month_opening: numeric({ precision: 12, scale:  2 }),
	units_this_month: numeric(),
	included_units_per_month: numeric({ precision: 10, scale:  2 }),
	recharged_this_month: numeric(),
	units_left: numeric(),
	rate_per_unit: numeric({ precision: 8, scale:  2 }),
}).as(sql`SELECT rm.meter_id, rm.meter_no, rm.space_id, s.space_code, rp.room_type_id, lr.reading_kwh AS last_reading, lr.reading_at AS last_reading_at, COALESCE(mo.reading_kwh, fm.reading_kwh) AS month_opening, lr.reading_kwh - COALESCE(mo.reading_kwh, fm.reading_kwh) AS units_this_month, t.included_units_per_month, rc.units AS recharged_this_month, COALESCE(t.included_units_per_month, 0::numeric) + rc.units - COALESCE(lr.reading_kwh - COALESCE(mo.reading_kwh, fm.reading_kwh), 0::numeric) AS units_left, t.rate_per_unit FROM hostel.room_meter rm JOIN infra.space s ON s.space_id::text = rm.space_id::text JOIN hostel.room_profile rp ON rp.space_id::text = rm.space_id::text LEFT JOIN hostel.electricity_tariff t ON t.room_type_id = rp.room_type_id AND t.approved_by IS NOT NULL AND CURRENT_DATE >= t.effective_from AND (t.effective_to IS NULL OR CURRENT_DATE <= t.effective_to) LEFT JOIN LATERAL ( SELECT r.reading_kwh, r.reading_at FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id ORDER BY r.reading_at DESC LIMIT 1) lr ON true LEFT JOIN LATERAL ( SELECT r.reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at < date_trunc('month'::text, now()) ORDER BY r.reading_at DESC LIMIT 1) mo ON true LEFT JOIN LATERAL ( SELECT r.reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at >= date_trunc('month'::text, now()) ORDER BY r.reading_at LIMIT 1) fm ON true LEFT JOIN LATERAL ( SELECT COALESCE(sum(mr.units_credited), 0::numeric) AS units FROM hostel.meter_recharge mr WHERE mr.meter_id = rm.meter_id AND (mr.status = ANY (ARRAY['Paid'::hostel.recharge_status, 'Credited'::hostel.recharge_status])) AND date_trunc('month'::text, mr.created_at) = date_trunc('month'::text, now())) rc ON true WHERE rm.status = 'Active'::hostel.meter_status`);

export const v_rpt_occupancy_fees_duesInHostel = hostel.view("v_rpt_occupancy_fees_dues", {	facility_id: varchar({ length: 30 }),
	hostel_name: varchar({ length: 120 }),
	hostel_code: varchar({ length: 10 }),
	total_beds: numeric(),
	occupied_beds: numeric(),
	vacant_beds: numeric(),
	held_beds: numeric(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	registrations: bigint({ mode: "number" }),
	demanded: numeric(),
	collected: numeric(),
	overdue: numeric(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	students_overdue: bigint({ mode: "number" }),
}).as(sql`SELECT facility_id, hostel_name, hostel_code, sum(total_beds) AS total_beds, sum(occupied_beds) AS occupied_beds, sum(vacant_beds) AS vacant_beds, sum(held_beds) AS held_beds, ( SELECT count(*) AS count FROM hostel.hostel_registration r WHERE r.facility_id::text = v.facility_id::text AND (r.status <> ALL (ARRAY['Cancelled'::hostel.registration_status, 'Vacated'::hostel.registration_status]))) AS registrations, ( SELECT COALESCE(sum(d.amount_due), 0::numeric) AS "coalesce" FROM hostel.fee_demand d JOIN hostel.hostel_registration r ON r.student_id::text = d.student_id::text AND r.facility_id::text = v.facility_id::text) AS demanded, ( SELECT COALESCE(sum(d.amount_paid), 0::numeric) AS "coalesce" FROM hostel.fee_demand d JOIN hostel.hostel_registration r ON r.student_id::text = d.student_id::text AND r.facility_id::text = v.facility_id::text) AS collected, ( SELECT COALESCE(sum(d.amount_due - d.amount_paid), 0::numeric) AS "coalesce" FROM hostel.fee_demand d JOIN hostel.hostel_registration r ON r.student_id::text = d.student_id::text AND r.facility_id::text = v.facility_id::text WHERE d.status = 'Overdue'::hostel.demand_status) AS overdue, ( SELECT count(DISTINCT d.student_id) AS count FROM hostel.fee_demand d JOIN hostel.hostel_registration r ON r.student_id::text = d.student_id::text AND r.facility_id::text = v.facility_id::text WHERE d.status = 'Overdue'::hostel.demand_status) AS students_overdue FROM hostel.v_vacancy v GROUP BY facility_id, hostel_name, hostel_code`);