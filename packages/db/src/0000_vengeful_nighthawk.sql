-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "ref";
--> statement-breakpoint
CREATE SCHEMA "portal";
--> statement-breakpoint
CREATE SCHEMA "infra";
--> statement-breakpoint
CREATE SCHEMA "shared";
--> statement-breakpoint
CREATE SCHEMA "hostel";
--> statement-breakpoint
CREATE TYPE "hostel"."access_purpose" AS ENUM('Routine', 'Alert', 'Parent_Query', 'Emergency');--> statement-breakpoint
CREATE TYPE "hostel"."alert_status" AS ENUM('Open', 'Acknowledged', 'Closed');--> statement-breakpoint
CREATE TYPE "hostel"."alert_type" AS ENUM('No_Pass_Exit', 'Pass_Overdue', 'Not_Seen', 'Fee_Overdue', 'Meter_Low', 'Checklist_Missed', 'Register_Missed', 'Sick_Meal_Missed', 'Ticket_Not_Done', 'Instalment_Overdue');--> statement-breakpoint
CREATE TYPE "hostel"."allocation_status" AS ENUM('Active', 'Vacated', 'Transferred');--> statement-breakpoint
CREATE TYPE "hostel"."assignment_status" AS ENUM('Active', 'Ended');--> statement-breakpoint
CREATE TYPE "hostel"."clearance_section" AS ENUM('Hostel_Office', 'Accounts', 'Mess', 'Electricity', 'Library', 'Floor_Warden');--> statement-breakpoint
CREATE TYPE "hostel"."clearance_status" AS ENUM('Pending', 'Cleared', 'Dues_Pending');--> statement-breakpoint
CREATE TYPE "hostel"."consent_given_by" AS ENUM('Student', 'Parent');--> statement-breakpoint
CREATE TYPE "hostel"."contact_relation" AS ENUM('Self', 'Father', 'Mother', 'Guardian', 'Spouse', 'Brother', 'Sister', 'Communication', 'Other');--> statement-breakpoint
CREATE TYPE "hostel"."cuisine" AS ENUM('South_Indian', 'North_Indian', 'Veg', 'Non_Veg', 'Jain', 'Special_Diet');--> statement-breakpoint
CREATE TYPE "hostel"."current_status" AS ENUM('In_Room', 'In_Hostel', 'On_Campus', 'Outside_On_Pass', 'On_Sick_Leave', 'Outside_No_Pass', 'Overdue', 'Not_Seen');--> statement-breakpoint
CREATE TYPE "hostel"."delivery_status" AS ENUM('Pending', 'Delivered', 'Not_Required', 'Missed');--> statement-breakpoint
CREATE TYPE "hostel"."demand_status" AS ENUM('Pending', 'Part_Paid', 'Paid', 'Overdue', 'Waived');--> statement-breakpoint
CREATE TYPE "hostel"."device_status" AS ENUM('Active', 'Faulty');--> statement-breakpoint
CREATE TYPE "hostel"."device_type" AS ENUM('Camera', 'Card_Reader', 'QR_Scanner', 'Manual');--> statement-breakpoint
CREATE TYPE "hostel"."direction" AS ENUM('In', 'Out');--> statement-breakpoint
CREATE TYPE "hostel"."event_source" AS ENUM('Scan', 'Camera', 'Manual');--> statement-breakpoint
CREATE TYPE "hostel"."fee_head" AS ENUM('Registration', 'Hostel', 'Mess', 'Electricity', 'Damage', 'Fine', 'Convention_Centre');--> statement-breakpoint
CREATE TYPE "hostel"."gateway_status" AS ENUM('Success', 'Failed', 'Pending');--> statement-breakpoint
CREATE TYPE "hostel"."handover_type" AS ENUM('Check_In', 'Check_Out');--> statement-breakpoint
CREATE TYPE "hostel"."hostel_gender" AS ENUM('Boys', 'Girls', 'Staff');--> statement-breakpoint
CREATE TYPE "hostel"."hostel_status" AS ENUM('Active', 'Closed');--> statement-breakpoint
CREATE TYPE "hostel"."item_condition" AS ENUM('Good', 'Fair', 'Damaged', 'Missing');--> statement-breakpoint
CREATE TYPE "hostel"."meal_slot" AS ENUM('Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner');--> statement-breakpoint
CREATE TYPE "hostel"."meter_status" AS ENUM('Active', 'Faulty', 'Replaced');--> statement-breakpoint
CREATE TYPE "hostel"."meter_type" AS ENUM('Smart_Prepaid', 'Manual');--> statement-breakpoint
CREATE TYPE "hostel"."occupant_type" AS ENUM('Student', 'Staff');--> statement-breakpoint
CREATE TYPE "hostel"."outing_category" AS ENUM('Same_Day', 'Day_Or_More');--> statement-breakpoint
CREATE TYPE "hostel"."outpass_status" AS ENUM('Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved', 'Approved', 'Rejected', 'Out', 'Returned', 'Overdue', 'Cancelled');--> statement-breakpoint
CREATE TYPE "hostel"."payment_mode" AS ENUM('UPI', 'Card', 'Net_Banking', 'Cash', 'DD');--> statement-breakpoint
CREATE TYPE "hostel"."plan_status" AS ENUM('Open', 'Fully_Paid', 'Cancelled');--> statement-breakpoint
CREATE TYPE "hostel"."plan_type" AS ENUM('Single', 'Two_Instalments');--> statement-breakpoint
CREATE TYPE "hostel"."point_type" AS ENUM('Room_Corridor', 'Hostel_Gate', 'Campus_Gate', 'Mess', 'Facility', 'Academic_Block');--> statement-breakpoint
CREATE TYPE "hostel"."punishment_status" AS ENUM('In_Force', 'Served', 'Revoked');--> statement-breakpoint
CREATE TYPE "hostel"."punishment_type" AS ENUM('Warning', 'Fine', 'Outing_Ban', 'Hostel_Suspension', 'Expulsion', 'Community_Service');--> statement-breakpoint
CREATE TYPE "hostel"."qr_status" AS ENUM('Active', 'Replaced');--> statement-breakpoint
CREATE TYPE "hostel"."reading_source" AS ENUM('Auto', 'Manual', 'Handover');--> statement-breakpoint
CREATE TYPE "hostel"."recharge_status" AS ENUM('Paid', 'Credited', 'Failed', 'Refunded');--> statement-breakpoint
CREATE TYPE "hostel"."registration_status" AS ENUM('Applied', 'Fee_Paid', 'Waitlisted', 'Allotted', 'Accepted', 'Confirmed', 'Checked_In', 'Cancelled', 'Vacated');--> statement-breakpoint
CREATE TYPE "hostel"."reserved_for" AS ENUM('None', 'Staff', 'Guest', 'Medical');--> statement-breakpoint
CREATE TYPE "hostel"."severity" AS ENUM('Info', 'Warning', 'Critical');--> statement-breakpoint
CREATE TYPE "hostel"."shift" AS ENUM('Morning', 'Evening', 'Night', 'General');--> statement-breakpoint
CREATE TYPE "hostel"."sick_leave_status" AS ENUM('Applied', 'Recommended', 'Approved', 'Rejected', 'Closed');--> statement-breakpoint
CREATE TYPE "hostel"."student_decision" AS ENUM('Pending', 'Accepted', 'Declined', 'Expired');--> statement-breakpoint
CREATE TYPE "hostel"."subscription_status" AS ENUM('Active', 'Suspended', 'Closed');--> statement-breakpoint
CREATE TYPE "hostel"."vacate_reason" AS ENUM('Course_Completed', 'Semester_End', 'Transfer', 'Discipline', 'Medical', 'Personal', 'Other');--> statement-breakpoint
CREATE TYPE "hostel"."vacate_status" AS ENUM('Applied', 'L1_Approved', 'L2_Approved', 'L3_Approved', 'Approved', 'Rejected', 'Checked_Out', 'Cancelled');--> statement-breakpoint
CREATE TYPE "infra"."activity_type" AS ENUM('Sports_Practice', 'Tournament', 'Seminar', 'Cultural', 'Club', 'Exam', 'External_Rental');--> statement-breakpoint
CREATE TYPE "infra"."alloc_status" AS ENUM('Active', 'Cancelled');--> statement-breakpoint
CREATE TYPE "infra"."amc_status" AS ENUM('Active', 'Expired', 'Terminated');--> statement-breakpoint
CREATE TYPE "infra"."asset_category" AS ENUM('Furniture', 'Electrical', 'IT', 'Lab_Equipment', 'Sports_Equipment', 'Plumbing', 'Civil', 'Meter', 'Other');--> statement-breakpoint
CREATE TYPE "infra"."asset_condition" AS ENUM('Good', 'Fair', 'Poor', 'Scrap');--> statement-breakpoint
CREATE TYPE "infra"."avail_source" AS ENUM('Class', 'Lab', 'Booking', 'Maintenance');--> statement-breakpoint
CREATE TYPE "infra"."booking_status" AS ENUM('Requested', 'Approved', 'Rejected', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "infra"."day_of_week" AS ENUM('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');--> statement-breakpoint
CREATE TYPE "infra"."facility_status" AS ENUM('Active', 'Under_Maintenance', 'Closed');--> statement-breakpoint
CREATE TYPE "infra"."facility_type" AS ENUM('Academic', 'Hostel', 'Sports_Complex', 'Open_Ground', 'Admin', 'Library', 'Canteen', 'Convention_Centre', 'Store', 'Medical', 'Other');--> statement-breakpoint
CREATE TYPE "infra"."inspection_type" AS ENUM('Safety', 'Fire', 'Hygiene', 'Electrical', 'Ground_Condition');--> statement-breakpoint
CREATE TYPE "infra"."membership_status" AS ENUM('Active', 'Expired');--> statement-breakpoint
CREATE TYPE "infra"."pm_frequency" AS ENUM('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly');--> statement-breakpoint
CREATE TYPE "infra"."pm_status" AS ENUM('Active', 'Suspended');--> statement-breakpoint
CREATE TYPE "infra"."priority" AS ENUM('Low', 'Medium', 'High', 'Critical');--> statement-breakpoint
CREATE TYPE "infra"."raiser_type" AS ENUM('Student', 'Staff', 'Inspection', 'System');--> statement-breakpoint
CREATE TYPE "infra"."requester_type" AS ENUM('Student', 'Staff', 'Dept', 'External');--> statement-breakpoint
CREATE TYPE "infra"."slot_type" AS ENUM('Lecture', 'Lab', 'Break', 'Sports');--> statement-breakpoint
CREATE TYPE "infra"."space_category" AS ENUM('Classroom', 'Laboratory', 'Seminar_Hall', 'Auditorium', 'Hostel_Room', 'Office', 'Indoor_Court', 'Outdoor_Field', 'Gym', 'Swimming_Pool', 'Store', 'Toilet_Block', 'Common_Area', 'Mess_Hall', 'Library_Room', 'Activity_Centre', 'Play_Room', 'Convention_Hall', 'Gate', 'Corridor');--> statement-breakpoint
CREATE TYPE "infra"."space_status" AS ENUM('Available', 'Occupied', 'Under_Maintenance', 'Decommissioned');--> statement-breakpoint
CREATE TYPE "infra"."subspace_status" AS ENUM('Vacant', 'Held', 'Occupied', 'Damaged');--> statement-breakpoint
CREATE TYPE "infra"."subspace_type" AS ENUM('Bed', 'Workstation', 'Seat', 'Lane', 'Court_Section');--> statement-breakpoint
CREATE TYPE "infra"."ticket_status" AS ENUM('Open', 'Assigned', 'In_Progress', 'Resolved', 'Closed', 'Reopened');--> statement-breakpoint
CREATE TYPE "infra"."utility_type" AS ENUM('Electricity', 'Water', 'Gas', 'Internet');--> statement-breakpoint
CREATE TYPE "infra"."wo_status" AS ENUM('Planned', 'In_Progress', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "infra"."zone_type" AS ENUM('Floor', 'Wing', 'Outdoor_Zone');--> statement-breakpoint
CREATE TYPE "portal"."adjustment_type" AS ENUM('Physical_Count_Variance', 'Damage', 'Expiry', 'Theft', 'Write_Off', 'Correction');--> statement-breakpoint
CREATE TYPE "portal"."advance_status" AS ENUM('Paid', 'Partially_Adjusted', 'Fully_Adjusted', 'Refunded');--> statement-breakpoint
CREATE TYPE "portal"."alert_severity" AS ENUM('Info', 'Warning', 'Critical');--> statement-breakpoint
CREATE TYPE "portal"."alert_status" AS ENUM('Open', 'Acknowledged', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."amc_renewal_status" AS ENUM('Proposed', 'Pending_Finance', 'Approved', 'Rejected', 'Renewed');--> statement-breakpoint
CREATE TYPE "portal"."approval_action" AS ENUM('Approved', 'Rejected', 'Returned', 'Delegated');--> statement-breakpoint
CREATE TYPE "portal"."approval_status" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "portal"."asset_tag_status" AS ENUM('In_Store', 'Installed', 'Under_Repair', 'Transferred', 'Scrapped', 'Disposed');--> statement-breakpoint
CREATE TYPE "portal"."audit_status" AS ENUM('Clear', 'Flagged', 'Cleared_By_Review');--> statement-breakpoint
CREATE TYPE "portal"."bid_status" AS ENUM('Received', 'Under_Evaluation', 'Ranked', 'Selected', 'Rejected');--> statement-breakpoint
CREATE TYPE "portal"."bin_status" AS ENUM('Active', 'Blocked');--> statement-breakpoint
CREATE TYPE "portal"."budget_category" AS ENUM('Capital', 'Revenue_Consumables', 'Maintenance', 'Sports', 'Hostel', 'Lab', 'IT');--> statement-breakpoint
CREATE TYPE "portal"."budget_ref_type" AS ENUM('PR', 'PO', 'Invoice', 'Issue_Note', 'Adjustment', 'Hostel_Fee');--> statement-breakpoint
CREATE TYPE "portal"."budget_status" AS ENUM('Active', 'Frozen', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."budget_txn_type" AS ENUM('Commitment', 'Commitment_Release', 'Utilisation', 'Reversal', 'Reallocation');--> statement-breakpoint
CREATE TYPE "portal"."capitalisation_status" AS ENUM('Capitalised', 'Transferred', 'Disposed');--> statement-breakpoint
CREATE TYPE "portal"."condition_status" AS ENUM('Open', 'Met', 'Breached', 'Waived');--> statement-breakpoint
CREATE TYPE "portal"."count_status" AS ENUM('Planned', 'In_Progress', 'Completed', 'Reconciled');--> statement-breakpoint
CREATE TYPE "portal"."count_type" AS ENUM('Annual', 'Quarterly', 'Cycle', 'Surprise');--> statement-breakpoint
CREATE TYPE "portal"."deployment_status" AS ENUM('Requested', 'Approved', 'Planned', 'Site_Not_Ready', 'In_Progress', 'Installed', 'Commissioned', 'Handed_Over', 'Failed');--> statement-breakpoint
CREATE TYPE "portal"."depreciation_method" AS ENUM('SLM', 'WDV');--> statement-breakpoint
CREATE TYPE "portal"."freight_paid_by" AS ENUM('Vendor', 'Institute');--> statement-breakpoint
CREATE TYPE "portal"."fulfilment_source" AS ENUM('Sub_Store', 'Central_Store_Transfer', 'Purchase', 'Not_Required');--> statement-breakpoint
CREATE TYPE "portal"."gate_status" AS ENUM('Entered', 'Sent_To_Store', 'Exited');--> statement-breakpoint
CREATE TYPE "portal"."gl_account_type" AS ENUM('Asset', 'Liability', 'Expense', 'Income', 'Equity');--> statement-breakpoint
CREATE TYPE "portal"."grn_status" AS ENUM('Draft', 'Under_Inspection', 'Accepted', 'Partially_Accepted', 'Rejected', 'Posted');--> statement-breakpoint
CREATE TYPE "portal"."indent_line_status" AS ENUM('Pending', 'Available', 'Transfer_Requested', 'Purchase_Requested', 'Issued', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."indent_priority" AS ENUM('Normal', 'Urgent', 'Emergency');--> statement-breakpoint
CREATE TYPE "portal"."indent_status" AS ENUM('Draft', 'Submitted', 'HOD_Approved', 'Stores_Verified', 'Partially_Issued', 'Issued', 'Sent_To_Purchase', 'Closed', 'Rejected');--> statement-breakpoint
CREATE TYPE "portal"."inspection_kind" AS ENUM('Visual', 'Functional', 'Sample_Test', 'Full_Test', 'Third_Party');--> statement-breakpoint
CREATE TYPE "portal"."inspection_result" AS ENUM('Accepted', 'Partially_Accepted', 'Rejected');--> statement-breakpoint
CREATE TYPE "portal"."installed_by_type" AS ENUM('Vendor', 'Internal_Maintenance_Team', 'Third_Party');--> statement-breakpoint
CREATE TYPE "portal"."invoice_status" AS ENUM('Received', 'Under_Verification', 'Approved', 'Partially_Paid', 'Paid', 'On_Hold', 'Rejected');--> statement-breakpoint
CREATE TYPE "portal"."issue_method" AS ENUM('PIN', 'OTP', 'Signature');--> statement-breakpoint
CREATE TYPE "portal"."issue_status" AS ENUM('Awaiting_Collection', 'Issued', 'Acknowledged', 'Partially_Returned', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."item_nature" AS ENUM('Consumable', 'Capital_Asset', 'Spare_Part', 'Service');--> statement-breakpoint
CREATE TYPE "portal"."journal_source" AS ENUM('GRN', 'Invoice', 'Payment', 'Issue_Note', 'Adjustment', 'Capitalisation', 'Debit_Note', 'Credit_Note', 'Hostel_Fee', 'Hostel_Damage', 'Meter_Recharge');--> statement-breakpoint
CREATE TYPE "portal"."journal_status" AS ENUM('Draft', 'Posted', 'Reversed');--> statement-breakpoint
CREATE TYPE "portal"."ledger_group" AS ENUM('Purchase_Accounts', 'Sales_Accounts', 'Expense', 'Asset', 'Liability', 'Income', 'Equity');--> statement-breakpoint
CREATE TYPE "portal"."material_status" AS ENUM('Active', 'Discontinued', 'Blocked');--> statement-breakpoint
CREATE TYPE "portal"."matrix_doc_type" AS ENUM('PR', 'PO', 'Payment', 'Indent', 'GRN', 'Invoice', 'Adjustment', 'Stock_Entry', 'Deployment');--> statement-breakpoint
CREATE TYPE "portal"."movement_type" AS ENUM('Opening_Balance', 'Receipt', 'Issue', 'Transfer_Out', 'Transfer_In', 'Return_In', 'Return_To_Vendor', 'Adjustment_Plus', 'Adjustment_Minus', 'Scrap', 'Deployment', 'Physical_Count');--> statement-breakpoint
CREATE TYPE "portal"."new_request_status" AS ENUM('Submitted', 'Recommended', 'Price_Checked', 'Registered', 'Rejected');--> statement-breakpoint
CREATE TYPE "portal"."note_reason" AS ENUM('Rejection', 'Short_Supply', 'Price_Difference', 'Penalty', 'Rate_Revision');--> statement-breakpoint
CREATE TYPE "portal"."note_status" AS ENUM('Raised', 'Accepted_By_Vendor', 'Adjusted', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."note_type" AS ENUM('Debit_Note', 'Credit_Note');--> statement-breakpoint
CREATE TYPE "portal"."pass_fail" AS ENUM('Pass', 'Fail');--> statement-breakpoint
CREATE TYPE "portal"."payment_mode" AS ENUM('NEFT', 'RTGS', 'Cheque', 'UPI', 'Cash', 'DD');--> statement-breakpoint
CREATE TYPE "portal"."payment_status" AS ENUM('Draft', 'Approved', 'Paid', 'Failed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "portal"."payment_type" AS ENUM('Advance', 'Against_Invoice', 'Retention_Release', 'Refund');--> statement-breakpoint
CREATE TYPE "portal"."po_change_type" AS ENUM('Qty', 'Price', 'Delivery_Date', 'Item_Spec', 'Terms', 'Cancellation');--> statement-breakpoint
CREATE TYPE "portal"."po_line_status" AS ENUM('Open', 'Partially_Received', 'Received', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."po_stage" AS ENUM('Draft', 'Approved', 'Sent', 'Acknowledged', 'Dispatched', 'In_Transit', 'Arrived_At_Gate', 'Partially_Received', 'Fully_Received', 'Invoiced', 'Closed', 'Cancelled', 'Short_Closed');--> statement-breakpoint
CREATE TYPE "portal"."po_type" AS ENUM('Standard', 'Rate_Contract', 'Blanket', 'Emergency', 'Service');--> statement-breakpoint
CREATE TYPE "portal"."pr_line_status" AS ENUM('Open', 'RFQ', 'Ordered', 'Received', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."pr_status" AS ENUM('Draft', 'Submitted', 'Approved', 'RFQ_Issued', 'PO_Created', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TYPE "portal"."pr_type" AS ENUM('Indent_Shortfall', 'Reorder', 'Capital_Project', 'Emergency', 'AMC_Service');--> statement-breakpoint
CREATE TYPE "portal"."qty_basis" AS ENUM('as_written', 'added_up', 'needs_a_person');--> statement-breakpoint
CREATE TYPE "portal"."receipt_status" AS ENUM('Draft', 'Verified', 'Rejected');--> statement-breakpoint
CREATE TYPE "portal"."replenish_from" AS ENUM('Central_Store', 'Purchase');--> statement-breakpoint
CREATE TYPE "portal"."return_condition" AS ENUM('Good', 'Repairable', 'Scrap');--> statement-breakpoint
CREATE TYPE "portal"."return_reason" AS ENUM('Surplus', 'Defective', 'Wrong_Item', 'Project_Closed', 'Replacement');--> statement-breakpoint
CREATE TYPE "portal"."return_status" AS ENUM('Raised', 'Accepted', 'Rejected');--> statement-breakpoint
CREATE TYPE "portal"."rfq_mode" AS ENUM('Open_Tender', 'Limited_Tender', 'Single_Quote', 'GeM_Portal', 'Rate_Contract');--> statement-breakpoint
CREATE TYPE "portal"."rfq_response" AS ENUM('Invited', 'Quoted', 'Declined', 'No_Response');--> statement-breakpoint
CREATE TYPE "portal"."rfq_status" AS ENUM('Draft', 'Issued', 'Closed', 'Evaluated', 'Awarded', 'Cancelled');--> statement-breakpoint
CREATE TYPE "portal"."rtv_action" AS ENUM('Replace', 'Credit_Note', 'Refund', 'Repair');--> statement-breakpoint
CREATE TYPE "portal"."rtv_reason" AS ENUM('Damaged', 'Spec_Mismatch', 'Excess', 'Expired', 'Defective_In_Warranty');--> statement-breakpoint
CREATE TYPE "portal"."rtv_status" AS ENUM('Raised', 'Vendor_Notified', 'Returned', 'Replaced', 'Credited', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."scoring_method" AS ENUM('Lowest_Best', 'Highest_Best', 'Manual_1_to_5');--> statement-breakpoint
CREATE TYPE "portal"."scrap_status" AS ENUM('Pending', 'Received_At_Store', 'Scrapped');--> statement-breakpoint
CREATE TYPE "portal"."serial_status" AS ENUM('In_Store', 'Issued', 'Installed', 'Under_Repair', 'Scrapped');--> statement-breakpoint
CREATE TYPE "portal"."service_ticket_status" AS ENUM('Open', 'Vendor_Called', 'Repaired', 'Replaced', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."shipment_status" AS ENUM('Dispatched', 'In_Transit', 'At_Gate', 'Received', 'Damaged_In_Transit', 'Returned');--> statement-breakpoint
CREATE TYPE "portal"."spec_compliance" AS ENUM('Fully', 'Partially', 'Not_Compliant');--> statement-breakpoint
CREATE TYPE "portal"."storage_condition" AS ENUM('Normal', 'Cold', 'Hazardous', 'Secure');--> statement-breakpoint
CREATE TYPE "portal"."store_status" AS ENUM('Active', 'Closed');--> statement-breakpoint
CREATE TYPE "portal"."store_type" AS ENUM('Central', 'Department_SubStore', 'Hostel_SubStore', 'Sports_SubStore', 'Maintenance_SubStore', 'Lab_Store', 'Godown');--> statement-breakpoint
CREATE TYPE "portal"."tax_type" AS ENUM('GST', 'TDS', 'Cess');--> statement-breakpoint
CREATE TYPE "portal"."taxability" AS ENUM('Taxable', 'Exempt', 'Nil_Rated');--> statement-breakpoint
CREATE TYPE "portal"."test_result" AS ENUM('Pass', 'Fail', 'Conditional');--> statement-breakpoint
CREATE TYPE "portal"."three_way_match" AS ENUM('Matched', 'Qty_Mismatch', 'Price_Mismatch', 'Not_Matched');--> statement-breakpoint
CREATE TYPE "portal"."tracking_source" AS ENUM('Vendor', 'Transporter_API', 'Store_Staff');--> statement-breakpoint
CREATE TYPE "portal"."transfer_status" AS ENUM('Requested', 'Approved', 'Dispatched', 'Received', 'Partially_Received', 'Cancelled');--> statement-breakpoint
CREATE TYPE "portal"."transfer_type" AS ENUM('Replenishment', 'Indent_Fulfilment', 'Rebalancing', 'Emergency');--> statement-breakpoint
CREATE TYPE "portal"."transport_mode" AS ENUM('Road', 'Rail', 'Air', 'Courier');--> statement-breakpoint
CREATE TYPE "portal"."valuation_method" AS ENUM('FIFO', 'Weighted_Average', 'Standard', 'Average_Cost', 'Average_Price');--> statement-breakpoint
CREATE TYPE "portal"."vendor_status" AS ENUM('Active', 'Inactive', 'Blacklisted');--> statement-breakpoint
CREATE TYPE "portal"."vendor_type" AS ENUM('Manufacturer', 'Distributor', 'Dealer', 'Service_Provider', 'Transporter');--> statement-breakpoint
CREATE TYPE "ref"."address_type" AS ENUM('Permanent', 'Present', 'Communication');--> statement-breakpoint
CREATE TYPE "ref"."admission_type" AS ENUM('Regular', 'Distance', 'Lateral_Entry');--> statement-breakpoint
CREATE TYPE "ref"."blood_group" AS ENUM('A+ve', 'A-ve', 'B+ve', 'B-ve', 'AB+ve', 'AB-ve', 'O+ve', 'O-ve', 'NA');--> statement-breakpoint
CREATE TYPE "ref"."caste_category" AS ENUM('OC', 'BC', 'Other_BC', 'General', 'SC', 'ST', 'EWS', 'NA');--> statement-breakpoint
CREATE TYPE "ref"."gender" AS ENUM('Male', 'Female', 'Other');--> statement-breakpoint
CREATE TYPE "ref"."indoor_outdoor" AS ENUM('Indoor', 'Outdoor');--> statement-breakpoint
CREATE TYPE "ref"."marital_status" AS ENUM('Single', 'Married', 'Divorced', 'Widowed', 'NA');--> statement-breakpoint
CREATE TYPE "ref"."offering_mode" AS ENUM('Regular', 'Regular_PBL', 'Part_Time', 'Full_Time', 'Online', 'Distance');--> statement-breakpoint
CREATE TYPE "ref"."recruitment_type" AS ENUM('Permanent', 'Adhoc', 'Contract', 'Outsourced', 'Visiting');--> statement-breakpoint
CREATE TYPE "ref"."relation" AS ENUM('Self', 'Father', 'Mother', 'Guardian', 'Spouse', 'Brother', 'Sister', 'Son', 'Daughter', 'Communication', 'Other');--> statement-breakpoint
CREATE TYPE "ref"."staff_type" AS ENUM('Faculty', 'Warden', 'Lab_Assistant', 'Maintenance', 'Sports_Coach', 'Admin', 'Security', 'Housekeeping', 'Mess', 'Medical', 'Counsellor', 'Other');--> statement-breakpoint
CREATE TYPE "ref"."student_status" AS ENUM('Active', 'Cancelled', 'Suspended', 'Alumni');--> statement-breakpoint
CREATE TYPE "ref"."student_type" AS ENUM('UG', 'PG', 'PhD', 'Certificate', 'Graduate_Diploma', 'PG_Diploma', 'PDF', 'JRF', 'SRF', 'Other');--> statement-breakpoint
CREATE TYPE "ref"."subject_type" AS ENUM('Theory', 'Lab');--> statement-breakpoint
CREATE TYPE "shared"."active_status" AS ENUM('Active', 'Inactive');--> statement-breakpoint
CREATE TYPE "shared"."channel" AS ENUM('SMS', 'WhatsApp', 'Email', 'Push', 'In_App');--> statement-breakpoint
CREATE TYPE "shared"."decision" AS ENUM('Pending', 'Recommended', 'Approved', 'Rejected', 'Skipped', 'Expired');--> statement-breakpoint
CREATE TYPE "shared"."delivery_status" AS ENUM('Queued', 'Sent', 'Delivered', 'Failed', 'Read');--> statement-breakpoint
CREATE TYPE "shared"."document_kind" AS ENUM('Invoice', 'Delivery_Challan', 'Donation_Letter', 'Quotation', 'Test_Report', 'Medical_Note', 'Photo', 'Handover_Sheet', 'QR_Label', 'Receipt', 'Consent_Form', 'Other');--> statement-breakpoint
CREATE TYPE "shared"."import_source" AS ENUM('ERP_Student', 'ERP_Staff', 'ERP_Department', 'Academic_Attendance', 'Academic_Marks', 'Academic_Term', 'Infra_Space', 'Portal_Material');--> statement-breakpoint
CREATE TYPE "shared"."import_status" AS ENUM('Received', 'Processing', 'Completed', 'Failed', 'Partially_Completed');--> statement-breakpoint
CREATE TYPE "shared"."recipient_type" AS ENUM('Student', 'Parent', 'Staff');--> statement-breakpoint
CREATE TYPE "shared"."request_type" AS ENUM('Outpass', 'Sick_Leave', 'Vacate', 'Discipline', 'Convention_Booking', 'Hostel_Registration', 'Indent');--> statement-breakpoint
CREATE TYPE "shared"."visibility_scope" AS ENUM('Own', 'Floor', 'Hostel', 'All');--> statement-breakpoint
CREATE SEQUENCE "shared"."audit_log_audit_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE SEQUENCE "hostel"."movement_event_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "ref"."department" (
	"dept_code" varchar(20) PRIMARY KEY NOT NULL,
	"dept_name" varchar(120) NOT NULL,
	"hod_staff_id" varchar(20),
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref"."course" (
	"course_id" varchar(30) PRIMARY KEY NOT NULL,
	"dept_code" varchar(20) NOT NULL,
	"course_name" varchar(120) NOT NULL,
	"duration_years" numeric(3, 1),
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref"."section" (
	"section_id" varchar(30) PRIMARY KEY NOT NULL,
	"course_id" varchar(30) NOT NULL,
	"year" smallint NOT NULL,
	"section_name" varchar(30) NOT NULL,
	"strength" integer,
	"class_advisor_id" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "ref"."batch" (
	"batch_id" varchar(30) PRIMARY KEY NOT NULL,
	"section_id" varchar(30) NOT NULL,
	"batch_name" varchar(30) NOT NULL,
	"size" integer
);
--> statement-breakpoint
CREATE TABLE "ref"."subject" (
	"subject_id" varchar(30) PRIMARY KEY NOT NULL,
	"course_id" varchar(30) NOT NULL,
	"subject_name" varchar(120) NOT NULL,
	"subject_type" "ref"."subject_type" NOT NULL,
	"credits" numeric(3, 1)
);
--> statement-breakpoint
CREATE TABLE "ref"."staff_qualification" (
	"qualification_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref"."ref.staff_qualification_qualification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"staff_id" varchar(20) NOT NULL,
	"degree" varchar(60),
	"specialization" varchar(120),
	"university" varchar(160),
	"college" varchar(160),
	"cgpa_or_pct" numeric(6, 2),
	"year_of_passing" smallint
);
--> statement-breakpoint
CREATE TABLE "ref"."staff_master" (
	"staff_id" varchar(20) PRIMARY KEY NOT NULL,
	"salutation" varchar(10),
	"first_name" varchar(80) NOT NULL,
	"middle_name" varchar(80),
	"last_name" varchar(80),
	"full_name" varchar(200) GENERATED ALWAYS AS (btrim(((((first_name)::text || ' '::text) || COALESCE(((middle_name)::text || ' '::text), ''::text)) || (COALESCE(last_name, ''::character varying))::text))) STORED,
	"gender" "ref"."gender" NOT NULL,
	"date_of_birth" date,
	"blood_group" "ref"."blood_group",
	"caste_category" "ref"."caste_category",
	"disability" varchar(60),
	"marital_status" "ref"."marital_status",
	"nationality" varchar(40),
	"religion" varchar(40),
	"mother_tongue" varchar(40),
	"birth_place" varchar(80),
	"father_name" varchar(120),
	"mother_name" varchar(120),
	"height_cm" numeric(5, 1),
	"weight_kg" numeric(5, 1),
	"pf_number" varchar(30),
	"joining_date" date,
	"dept_code" varchar(20) NOT NULL,
	"designation" varchar(80) NOT NULL,
	"staff_type" "ref"."staff_type" DEFAULT 'Other' NOT NULL,
	"recruitment_type" "ref"."recruitment_type",
	"recruit_agency" varchar(80),
	"campus_code" varchar(20),
	"personal_email" varchar(120),
	"official_email" varchar(120),
	"mobile_no" varchar(15) NOT NULL,
	"communication_no" varchar(15),
	"photo_object_key" varchar(200),
	"resume_link" varchar(300),
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"import_batch_id" bigint
);
--> statement-breakpoint
CREATE TABLE "ref"."staff_contact" (
	"contact_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref"."ref.staff_contact_contact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"staff_id" varchar(20) NOT NULL,
	"contact_type" varchar(30) NOT NULL,
	"contact_person" varchar(120),
	"phone_number" varchar(15) NOT NULL,
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref"."staff_dependent" (
	"dependent_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref"."ref.staff_dependent_dependent_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"staff_id" varchar(20) NOT NULL,
	"relation" "ref"."relation" NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"date_of_birth" date,
	"gender" "ref"."gender",
	"is_nominee" boolean DEFAULT false NOT NULL,
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ref"."staff_employment_history" (
	"employment_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref"."ref.staff_employment_history_employment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"staff_id" varchar(20) NOT NULL,
	"employer_name" varchar(160) NOT NULL,
	"job_type" varchar(40),
	"designation" varchar(80),
	"joining_date" date,
	"leaving_date" date,
	"salary" numeric(12, 2),
	"employer_address" text,
	"city" varchar(80),
	"state" varchar(80),
	"country" varchar(60)
);
--> statement-breakpoint
CREATE TABLE "ref"."staff_membership" (
	"membership_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref"."ref.staff_membership_membership_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"staff_id" varchar(20) NOT NULL,
	"body_name" varchar(160) NOT NULL,
	"membership_no" varchar(60),
	"subscription" varchar(40),
	"from_date" date,
	"end_date" date
);
--> statement-breakpoint
CREATE TABLE "ref"."sport" (
	"sport_id" varchar(30) PRIMARY KEY NOT NULL,
	"sport_name" varchar(80) NOT NULL,
	"indoor_outdoor" "ref"."indoor_outdoor" NOT NULL,
	"default_space_id" varchar(30)
);
--> statement-breakpoint
CREATE TABLE "ref"."staff_responsibility" (
	"responsibility_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ref"."ref.staff_responsibility_responsibility_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"staff_id" varchar(20) NOT NULL,
	"designation" varchar(120) NOT NULL,
	"start_date" date,
	"end_date" date
);
--> statement-breakpoint
CREATE TABLE "ref"."student_master" (
	"student_id" varchar(20) PRIMARY KEY NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"admission_type" "ref"."admission_type" DEFAULT 'Regular' NOT NULL,
	"father_name" varchar(120),
	"mother_name" varchar(120),
	"regulation" varchar(10),
	"student_type" "ref"."student_type" NOT NULL,
	"course_id" varchar(30),
	"programme" varchar(80) NOT NULL,
	"offering_mode" "ref"."offering_mode",
	"section_id" varchar(30),
	"year_semester" varchar(20),
	"gender" "ref"."gender" NOT NULL,
	"date_of_birth" date NOT NULL,
	"caste_category" "ref"."caste_category",
	"economic_status" varchar(20),
	"family_income_band" varchar(20),
	"nationality" varchar(40) DEFAULT 'indian' NOT NULL,
	"religion" varchar(40),
	"blood_group" "ref"."blood_group",
	"disability" varchar(60),
	"personal_email" varchar(120) NOT NULL,
	"admission_date" date,
	"kleee_application_id" varchar(40),
	"seat_status" varchar(20),
	"dept_code" varchar(20),
	"counsellor_id" varchar(20),
	"photo_object_key" varchar(200),
	"is_hosteller" boolean DEFAULT false NOT NULL,
	"status" "ref"."student_status" DEFAULT 'Active' NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"import_batch_id" bigint
);
--> statement-breakpoint
CREATE TABLE "portal"."role" (
	"role_code" varchar(30) PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"module" varchar(20) DEFAULT 'portal' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra"."campus" (
	"campus_id" varchar(20) PRIMARY KEY NOT NULL,
	"campus_name" varchar(100) NOT NULL,
	"address" text,
	"total_area" numeric(12, 2),
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra"."facility" (
	"facility_id" varchar(30) PRIMARY KEY NOT NULL,
	"campus_id" varchar(20) NOT NULL,
	"facility_name" varchar(120) NOT NULL,
	"facility_type" "infra"."facility_type" NOT NULL,
	"area_sqm" numeric(12, 2),
	"no_of_floors" smallint DEFAULT 0 NOT NULL,
	"year_built" smallint,
	"incharge_id" varchar(20),
	"status" "infra"."facility_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra"."zone" (
	"zone_id" varchar(30) PRIMARY KEY NOT NULL,
	"facility_id" varchar(30) NOT NULL,
	"zone_name" varchar(80) NOT NULL,
	"zone_type" "infra"."zone_type" NOT NULL,
	"sequence_no" smallint
);
--> statement-breakpoint
CREATE TABLE "infra"."space" (
	"space_id" varchar(30) PRIMARY KEY NOT NULL,
	"zone_id" varchar(30) NOT NULL,
	"space_code" varchar(30) NOT NULL,
	"space_name" varchar(120) NOT NULL,
	"space_category" "infra"."space_category" NOT NULL,
	"capacity" integer,
	"area_sqm" numeric(10, 2),
	"has_ac" boolean DEFAULT false NOT NULL,
	"has_projector" boolean DEFAULT false NOT NULL,
	"is_bookable" boolean DEFAULT false NOT NULL,
	"booking_rate" numeric(12, 2),
	"status" "infra"."space_status" DEFAULT 'Available' NOT NULL,
	CONSTRAINT "space_zone_id_space_code_key" UNIQUE("space_code","zone_id")
);
--> statement-breakpoint
CREATE TABLE "infra"."subspace" (
	"subspace_id" varchar(30) PRIMARY KEY NOT NULL,
	"space_id" varchar(30) NOT NULL,
	"subspace_code" varchar(30) NOT NULL,
	"subspace_type" "infra"."subspace_type" NOT NULL,
	"status" "infra"."subspace_status" DEFAULT 'Vacant' NOT NULL,
	CONSTRAINT "subspace_space_id_subspace_code_key" UNIQUE("space_id","subspace_code")
);
--> statement-breakpoint
CREATE TABLE "infra"."asset_master" (
	"asset_id" varchar(40) PRIMARY KEY NOT NULL,
	"space_id" varchar(30),
	"asset_name" varchar(120) NOT NULL,
	"asset_category" "infra"."asset_category" NOT NULL,
	"make_model" varchar(120),
	"serial_no" varchar(80),
	"purchase_date" date,
	"cost" numeric(14, 2),
	"warranty_expiry" date,
	"vendor_id" varchar(20),
	"condition" "infra"."asset_condition" DEFAULT 'Good' NOT NULL,
	"last_service_date" date,
	"sku" varchar(30),
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra"."class_allocation" (
	"class_alloc_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.class_allocation_class_alloc_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"academic_year" varchar(9) NOT NULL,
	"semester" varchar(10) NOT NULL,
	"section_id" varchar(30) NOT NULL,
	"subject_id" varchar(30) NOT NULL,
	"faculty_id" varchar(20) NOT NULL,
	"space_id" varchar(30) NOT NULL,
	"slot_id" varchar(20) NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" "infra"."alloc_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra"."timetable_slot" (
	"slot_id" varchar(20) PRIMARY KEY NOT NULL,
	"day_of_week" "infra"."day_of_week" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"slot_type" "infra"."slot_type" NOT NULL,
	CONSTRAINT "timetable_slot_check" CHECK (end_time > start_time)
);
--> statement-breakpoint
CREATE TABLE "infra"."lab_allocation" (
	"lab_alloc_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.lab_allocation_lab_alloc_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"space_id" varchar(30) NOT NULL,
	"subject_id" varchar(30) NOT NULL,
	"batch_id" varchar(30) NOT NULL,
	"faculty_id" varchar(20) NOT NULL,
	"lab_assistant_id" varchar(20),
	"slot_id" varchar(20) NOT NULL,
	"academic_year" varchar(9) NOT NULL,
	"max_students" integer,
	"status" "infra"."alloc_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra"."lab_workstation_map" (
	"ws_map_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.lab_workstation_map_ws_map_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"lab_alloc_id" bigint NOT NULL,
	"subspace_id" varchar(30) NOT NULL,
	"student_id" varchar(20) NOT NULL,
	"assigned_date" date DEFAULT CURRENT_DATE NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra"."activity_booking" (
	"booking_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.activity_booking_booking_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"space_id" varchar(30) NOT NULL,
	"activity_type" "infra"."activity_type" NOT NULL,
	"activity_name" varchar(160) NOT NULL,
	"requested_by" varchar(40) NOT NULL,
	"requester_type" "infra"."requester_type" NOT NULL,
	"booking_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"expected_participants" integer,
	"approved_by" varchar(20),
	"booking_charges" numeric(12, 2),
	"status" "infra"."booking_status" DEFAULT 'Requested' NOT NULL,
	CONSTRAINT "activity_booking_check" CHECK (end_time > start_time)
);
--> statement-breakpoint
CREATE TABLE "infra"."sports_membership" (
	"sport_member_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.sports_membership_sport_member_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" varchar(20) NOT NULL,
	"sport_id" varchar(30) NOT NULL,
	"coach_id" varchar(20),
	"team_name" varchar(80),
	"membership_start" date NOT NULL,
	"membership_end" date,
	"status" "infra"."membership_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra"."space_availability_log" (
	"avail_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.space_availability_log_avail_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"space_id" varchar(30) NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"source_type" "infra"."avail_source" NOT NULL,
	"source_id" bigint NOT NULL,
	CONSTRAINT "space_availability_log_check" CHECK (end_time > start_time)
);
--> statement-breakpoint
CREATE TABLE "infra"."maintenance_category" (
	"category_id" varchar(20) PRIMARY KEY NOT NULL,
	"category_name" varchar(80) NOT NULL,
	"default_sla_hours" integer,
	"default_team_id" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "infra"."maintenance_team" (
	"team_id" varchar(20) PRIMARY KEY NOT NULL,
	"team_name" varchar(80) NOT NULL,
	"category_id" varchar(20),
	"supervisor_id" varchar(20),
	"contact" varchar(60)
);
--> statement-breakpoint
CREATE TABLE "infra"."technician" (
	"technician_id" varchar(20) PRIMARY KEY NOT NULL,
	"staff_id" varchar(20),
	"team_id" varchar(20),
	"skill_set" varchar(160),
	"shift" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "infra"."maintenance_ticket" (
	"ticket_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.maintenance_ticket_ticket_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"raised_by" varchar(40) NOT NULL,
	"raiser_type" "infra"."raiser_type" NOT NULL,
	"facility_id" varchar(30) NOT NULL,
	"space_id" varchar(30),
	"asset_id" varchar(40),
	"category_id" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"priority" "infra"."priority" DEFAULT 'Medium' NOT NULL,
	"raised_date" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_to" varchar(20),
	"assigned_date" timestamp with time zone,
	"resolved_date" timestamp with time zone,
	"resolution_notes" text,
	"cost_incurred" numeric(12, 2),
	"feedback_rating" smallint,
	"status" "infra"."ticket_status" DEFAULT 'Open' NOT NULL,
	"verified_by" varchar(20),
	"verified_at" timestamp with time zone,
	"deadline_at" timestamp with time zone,
	"closure_report" text,
	"auto_closed" boolean DEFAULT false NOT NULL,
	"follow_up_of" bigint,
	CONSTRAINT "maintenance_ticket_feedback_rating_check" CHECK ((feedback_rating >= 1) AND (feedback_rating <= 5))
);
--> statement-breakpoint
CREATE TABLE "infra"."inspection_log" (
	"inspection_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.inspection_log_inspection_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"facility_id" varchar(30) NOT NULL,
	"space_id" varchar(30),
	"inspection_type" "infra"."inspection_type" NOT NULL,
	"inspector_id" varchar(40) NOT NULL,
	"inspection_date" date NOT NULL,
	"findings" text,
	"score" numeric(5, 2),
	"action_required" boolean DEFAULT false NOT NULL,
	"ticket_id" bigint,
	"next_inspection_date" date
);
--> statement-breakpoint
CREATE TABLE "infra"."pm_schedule" (
	"pm_schedule_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.pm_schedule_pm_schedule_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"asset_id" varchar(40),
	"space_id" varchar(30),
	"category_id" varchar(20) NOT NULL,
	"frequency" "infra"."pm_frequency" NOT NULL,
	"task_checklist" text,
	"last_done_date" date,
	"next_due_date" date,
	"assigned_team_id" varchar(20),
	"status" "infra"."pm_status" DEFAULT 'Active' NOT NULL,
	CONSTRAINT "pm_schedule_check" CHECK ((asset_id IS NOT NULL) OR (space_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "infra"."work_order" (
	"work_order_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.work_order_work_order_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"ticket_id" bigint,
	"pm_schedule_id" bigint,
	"technician_id" varchar(20),
	"vendor_id" varchar(20),
	"scheduled_date" date,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"labour_hours" numeric(8, 2),
	"total_cost" numeric(12, 2),
	"downtime_hours" numeric(8, 2),
	"status" "infra"."wo_status" DEFAULT 'Planned' NOT NULL,
	CONSTRAINT "work_order_check" CHECK ((ticket_id IS NOT NULL) OR (pm_schedule_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "infra"."work_order_part" (
	"wo_part_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.work_order_part_wo_part_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"work_order_id" bigint NOT NULL,
	"sku" varchar(30) NOT NULL,
	"quantity_used" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "infra"."amc_contract" (
	"amc_id" varchar(30) PRIMARY KEY NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"asset_category" "infra"."asset_category",
	"asset_id" varchar(40),
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"annual_cost" numeric(12, 2),
	"visits_per_year" smallint,
	"status" "infra"."amc_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infra"."utility_consumption" (
	"utility_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "infra"."infra.utility_consumption_utility_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"facility_id" varchar(30) NOT NULL,
	"utility_type" "infra"."utility_type" NOT NULL,
	"meter_no" varchar(40),
	"reading_date" date NOT NULL,
	"units_consumed" numeric(14, 3),
	"cost" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "portal"."app_user" (
	"user_id" integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "portal"."portal.app_user_user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"staff_id" varchar(20),
	"full_name" varchar(160) NOT NULL,
	"email" varchar(120),
	"title" varchar(80),
	"home_dept" varchar(20),
	"idp_subject" varchar(120),
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "app_user_email_key" UNIQUE("email"),
	CONSTRAINT "app_user_idp_subject_key" UNIQUE("idp_subject")
);
--> statement-breakpoint
CREATE TABLE "portal"."category" (
	"category_code" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"parent_category_code" varchar(10),
	"item_nature" "portal"."item_nature",
	"is_capitalised" boolean DEFAULT false NOT NULL,
	"default_gl_account_id" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "portal"."sub_category" (
	"sub_category_id" integer PRIMARY KEY NOT NULL,
	"category_code" varchar(10) NOT NULL,
	"name" varchar(80) NOT NULL,
	CONSTRAINT "sub_category_category_code_name_key" UNIQUE("category_code","name")
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_group" (
	"group_code" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"parent_group_code" varchar(10)
);
--> statement-breakpoint
CREATE TABLE "portal"."unit_of_measure" (
	"uom" varchar(10) PRIMARY KEY NOT NULL,
	"formal_name" varchar(40) NOT NULL,
	"uqc" varchar(20),
	"decimal_places" smallint DEFAULT 0 NOT NULL,
	"conversion_to_base" numeric(12, 4),
	"base_uom" varchar(10)
);
--> statement-breakpoint
CREATE TABLE "portal"."gl_account" (
	"gl_account_id" varchar(20) PRIMARY KEY NOT NULL,
	"account_code" varchar(20) NOT NULL,
	"account_name" varchar(120) NOT NULL,
	"account_type" "portal"."gl_account_type" NOT NULL,
	"parent_account_id" varchar(20),
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL,
	CONSTRAINT "gl_account_account_code_key" UNIQUE("account_code")
);
--> statement-breakpoint
CREATE TABLE "portal"."ledger" (
	"ledger_code" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"ledger_group" "portal"."ledger_group" NOT NULL,
	"gl_account_id" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor" (
	"vendor_id" varchar(20) PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"vendor_type" "portal"."vendor_type",
	"city" varchar(80),
	"address" text,
	"contact_person" varchar(120),
	"phone" varchar(20),
	"email" varchar(120),
	"gstin" varchar(15),
	"pan_no" varchar(10),
	"bank_account_no" varchar(30),
	"ifsc_code" varchar(11),
	"payment_terms_days" smallint,
	"msme_registered" boolean DEFAULT false NOT NULL,
	"blacklist_flag" boolean DEFAULT false NOT NULL,
	"on_time_pct" numeric(5, 2),
	"quality_score" numeric(3, 1),
	"lead_days" smallint,
	"overall_rating" numeric(3, 2),
	"service_type" varchar(80),
	"status" "portal"."vendor_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."material" (
	"sku" varchar(30) PRIMARY KEY NOT NULL,
	"erp_material_code" varchar(20),
	"name" varchar(160) NOT NULL,
	"part_no" varchar(60),
	"description" text,
	"notes" text,
	"category_code" varchar(10),
	"sub_category_id" integer,
	"stock_group_code" varchar(10),
	"base_unit" varchar(10) NOT NULL,
	"alt_unit" varchar(10),
	"conversion_factor" numeric(12, 4),
	"hsn_sac_code" varchar(10),
	"gst_applicable" boolean DEFAULT true NOT NULL,
	"item_nature" "portal"."item_nature" DEFAULT 'Consumable' NOT NULL,
	"purchase_ledger_code" varchar(20),
	"sales_ledger_code" varchar(20),
	"cost_tracking" boolean DEFAULT false NOT NULL,
	"costing_method" "portal"."valuation_method" DEFAULT 'Weighted_Average' NOT NULL,
	"market_valuation_method" "portal"."valuation_method",
	"maintain_batches" boolean DEFAULT false NOT NULL,
	"track_mfg_date" boolean DEFAULT false NOT NULL,
	"use_expiry" boolean DEFAULT false NOT NULL,
	"shelf_life_days" integer,
	"list_price" numeric(14, 2),
	"standard_cost" numeric(14, 2),
	"reorder_level" numeric(14, 3),
	"min_order_qty" numeric(14, 3),
	"reorder_qty" numeric(14, 3),
	"consumption_period_days" integer,
	"reorder_criteria" varchar(10),
	"lead_time_days" integer,
	"brand" varchar(80),
	"model_no" varchar(80),
	"barcode_qr" varchar(80),
	"preferred_supplier_code" varchar(20),
	"custodian_dept_code" varchar(20),
	"warranty_months" integer,
	"requires_installation" boolean DEFAULT false NOT NULL,
	"requires_inspection" boolean DEFAULT false NOT NULL,
	"is_serialised" boolean DEFAULT false NOT NULL,
	"substitute_sku" varchar(30),
	"status" "portal"."material_status" DEFAULT 'Active' NOT NULL,
	CONSTRAINT "material_erp_material_code_key" UNIQUE("erp_material_code")
);
--> statement-breakpoint
CREATE TABLE "portal"."hsn_sac" (
	"hsn_sac_code" varchar(10) PRIMARY KEY NOT NULL,
	"description" varchar(160),
	"taxability" "portal"."taxability" DEFAULT 'Taxable' NOT NULL,
	"gst_rate" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."batch" (
	"batch_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.batch_batch_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"sku" varchar(30) NOT NULL,
	"batch_no" varchar(40) NOT NULL,
	"mfg_date" date,
	"expiry_date" date,
	CONSTRAINT "batch_sku_batch_no_key" UNIQUE("batch_no","sku")
);
--> statement-breakpoint
CREATE TABLE "portal"."location" (
	"location_code" varchar(10) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"campus_id" varchar(20),
	"store_type" "portal"."store_type" DEFAULT 'Central' NOT NULL,
	"parent_location_code" varchar(10),
	"dept_code" varchar(20),
	"facility_id" varchar(30),
	"space_id" varchar(30),
	"store_keeper_id" varchar(20),
	"can_purchase_directly" boolean DEFAULT false NOT NULL,
	"max_stock_value" numeric(14, 2),
	"distance_km" numeric(8, 2),
	"status" "portal"."store_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."bin" (
	"bin_code" varchar(20) PRIMARY KEY NOT NULL,
	"location_code" varchar(10) NOT NULL,
	"rack_no" varchar(10),
	"shelf_no" varchar(10),
	"capacity" numeric(12, 2),
	"storage_condition" "portal"."storage_condition" DEFAULT 'Normal' NOT NULL,
	"status" "portal"."bin_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."serialised_stock" (
	"serial_stock_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.serialised_stock_serial_stock_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"sku" varchar(30) NOT NULL,
	"serial_no" varchar(80) NOT NULL,
	"location_code" varchar(10),
	"grn_id" varchar(20),
	"asset_id" varchar(40),
	"status" serial_status DEFAULT 'In_Store' NOT NULL,
	CONSTRAINT "serialised_stock_sku_serial_no_key" UNIQUE("serial_no","sku")
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor_item" (
	"vendor_item_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.vendor_item_vendor_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"vendor_id" varchar(20) NOT NULL,
	"sku" varchar(30) NOT NULL,
	"vendor_item_code" varchar(60),
	"last_quoted_price" numeric(14, 2),
	"last_purchase_date" date,
	"min_order_qty" numeric(14, 3),
	"lead_time_days" integer,
	"is_preferred" boolean DEFAULT false NOT NULL,
	CONSTRAINT "vendor_item_vendor_id_sku_key" UNIQUE("sku","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."transporter" (
	"transporter_id" varchar(20) PRIMARY KEY NOT NULL,
	"transporter_name" varchar(120) NOT NULL,
	"vendor_id" varchar(20),
	"contact" varchar(120),
	"transport_mode" "portal"."transport_mode",
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."tax_master" (
	"tax_id" varchar(20) PRIMARY KEY NOT NULL,
	"tax_name" varchar(60) NOT NULL,
	"tax_type" "portal"."tax_type" NOT NULL,
	"rate_pct" numeric(5, 2) NOT NULL,
	"cgst_pct" numeric(5, 2),
	"sgst_pct" numeric(5, 2),
	"igst_pct" numeric(5, 2),
	"effective_from" date NOT NULL,
	"effective_to" date,
	"gl_account_id" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "portal"."budget_head" (
	"budget_code" varchar(30) PRIMARY KEY NOT NULL,
	"dept_code" varchar(20) NOT NULL,
	"fy" varchar(9) NOT NULL,
	"budget_category" "portal"."budget_category",
	"head_name" varchar(120),
	"gl_account_id" varchar(20),
	"allocated" numeric(16, 2) NOT NULL,
	"committed_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"utilised_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"balance_amount" numeric(16, 2) GENERATED ALWAYS AS (((allocated - committed_amount) - utilised_amount)) STORED,
	"status" "portal"."budget_status" DEFAULT 'Active' NOT NULL,
	CONSTRAINT "budget_head_dept_code_fy_budget_category_key" UNIQUE("budget_category","dept_code","fy")
);
--> statement-breakpoint
CREATE TABLE "portal"."reorder_rule" (
	"reorder_rule_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.reorder_rule_reorder_rule_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"location_code" varchar(10) NOT NULL,
	"sku" varchar(30) NOT NULL,
	"min_level" numeric(14, 3) NOT NULL,
	"max_level" numeric(14, 3),
	"reorder_qty" numeric(14, 3) NOT NULL,
	"replenish_from" "portal"."replenish_from" NOT NULL,
	"auto_generate" boolean DEFAULT false NOT NULL,
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL,
	CONSTRAINT "reorder_rule_location_code_sku_key" UNIQUE("location_code","sku")
);
--> statement-breakpoint
CREATE TABLE "portal"."approval_authority_matrix" (
	"matrix_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.approval_authority_matrix_matrix_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"document_type" "portal"."matrix_doc_type" NOT NULL,
	"value_from" numeric(16, 2) NOT NULL,
	"value_to" numeric(16, 2),
	"level_1_role" varchar(30),
	"level_2_role" varchar(30),
	"level_3_role" varchar(30),
	"requires_committee" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_movement" (
	"movement_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.stock_movement_movement_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sku" varchar(30) NOT NULL,
	"bin_code" varchar(20) NOT NULL,
	"batch_id" bigint,
	"qty" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(14, 2),
	"movement_type" "portal"."movement_type" NOT NULL,
	"actor_id" integer,
	"grn_id" varchar(20),
	"issue_id" varchar(20),
	"receipt_id" varchar(20),
	"stock_entry_id" varchar(20),
	"deployment_id" varchar(20),
	"srn_id" varchar(20),
	"transfer_id" bigint,
	"return_id" bigint,
	"adjustment_id" bigint,
	"rtv_id" bigint,
	"count_id" bigint,
	"balance_after" numeric(14, 3),
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "portal"."indent" (
	"indent_id" varchar(20) PRIMARY KEY NOT NULL,
	"dept_code" varchar(20) NOT NULL,
	"raised_by" integer NOT NULL,
	"raised_on" date DEFAULT CURRENT_DATE NOT NULL,
	"need_by" date,
	"purpose" text,
	"priority" "portal"."indent_priority" DEFAULT 'Normal' NOT NULL,
	"budget_code" varchar(30),
	"workflow_step" smallint DEFAULT 0 NOT NULL,
	"target_space_id" varchar(30),
	"work_order_id" bigint,
	"preferred_location" varchar(10),
	"hod_approval_by" varchar(20),
	"hod_approval_date" date,
	"status" "portal"."indent_status" DEFAULT 'Draft' NOT NULL,
	"facility_id" varchar(30),
	"ticket_id" bigint
);
--> statement-breakpoint
CREATE TABLE "portal"."indent_step" (
	"step" smallint PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."po_counter" (
	"fy" varchar(9) PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_transfer" (
	"transfer_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.stock_transfer_transfer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"transfer_no" varchar(20) NOT NULL,
	"from_location" varchar(10) NOT NULL,
	"to_location" varchar(10) NOT NULL,
	"transfer_type" "portal"."transfer_type" NOT NULL,
	"indent_id" varchar(20),
	"requested_by" varchar(20),
	"approved_by" varchar(20),
	"request_date" date DEFAULT CURRENT_DATE NOT NULL,
	"dispatch_date" date,
	"receipt_date" date,
	"status" "portal"."transfer_status" DEFAULT 'Requested' NOT NULL,
	CONSTRAINT "stock_transfer_transfer_no_key" UNIQUE("transfer_no"),
	CONSTRAINT "stock_transfer_check" CHECK ((from_location)::text <> (to_location)::text)
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_check" (
	"indent_id" varchar(20) PRIMARY KEY NOT NULL,
	"checked_by" integer,
	"checked_on" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "portal"."scrap_return" (
	"srn_id" varchar(20) PRIMARY KEY NOT NULL,
	"indent_id" varchar(20),
	"sku" varchar(30),
	"old_serial" varchar(80),
	"asset_id" varchar(40),
	"received_by" integer,
	"received_on" date,
	"status" "portal"."scrap_status" DEFAULT 'Pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."material_issue" (
	"issue_id" varchar(20) PRIMARY KEY NOT NULL,
	"indent_id" varchar(20) NOT NULL,
	"location_code" varchar(10),
	"dept_code" varchar(20),
	"issued_on" date DEFAULT CURRENT_DATE NOT NULL,
	"issued_by" integer,
	"collected_by" integer,
	"delivered_to_space_id" varchar(30),
	"method" "portal"."issue_method",
	"acknowledged_by" varchar(20),
	"acknowledged_on" date,
	"status" "portal"."issue_status" DEFAULT 'Awaiting_Collection' NOT NULL,
	"hostel_alloc_id" bigint,
	"ticket_id" bigint
);
--> statement-breakpoint
CREATE TABLE "portal"."dept_consumption" (
	"consumption_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.dept_consumption_consumption_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"dept_code" varchar(20) NOT NULL,
	"space_id" varchar(30),
	"sku" varchar(30) NOT NULL,
	"issue_id" varchar(20),
	"qty_received" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_consumed" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_returned" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_in_hand" numeric(14, 3) GENERATED ALWAYS AS (((qty_received - qty_consumed) - qty_returned)) STORED,
	"custodian_id" varchar(20),
	"period" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "portal"."receipt" (
	"receipt_id" varchar(20) PRIMARY KEY NOT NULL,
	"sku" varchar(30) NOT NULL,
	"qty" numeric(14, 3) NOT NULL,
	"unit_price" numeric(14, 2),
	"bin_code" varchar(20) NOT NULL,
	"reference" varchar(160),
	"owner_id" integer,
	"verified_by" integer,
	"received_on" date DEFAULT CURRENT_DATE NOT NULL,
	"status" "portal"."receipt_status" DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_entry" (
	"entry_id" varchar(20) PRIMARY KEY NOT NULL,
	"entry_on" date DEFAULT CURRENT_DATE NOT NULL,
	"sku" varchar(30) NOT NULL,
	"bin_code" varchar(20) NOT NULL,
	"qty" numeric(14, 3) NOT NULL,
	"unit_price" numeric(14, 2),
	"actor_id" integer,
	"matched_po_id" integer,
	"matched_indent_id" varchar(20),
	"audit_status" "portal"."audit_status" DEFAULT 'Clear' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_return" (
	"return_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.stock_return_return_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"return_no" varchar(20) NOT NULL,
	"from_dept" varchar(20) NOT NULL,
	"from_space_id" varchar(30),
	"to_location" varchar(10) NOT NULL,
	"issue_id" varchar(20),
	"return_reason" "portal"."return_reason" NOT NULL,
	"returned_by" varchar(20),
	"received_by" varchar(20),
	"return_date" date DEFAULT CURRENT_DATE NOT NULL,
	"condition" "portal"."return_condition" NOT NULL,
	"status" "portal"."return_status" DEFAULT 'Raised' NOT NULL,
	CONSTRAINT "stock_return_return_no_key" UNIQUE("return_no")
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_transfer_line" (
	"transfer_line_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.stock_transfer_line_transfer_line_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"transfer_id" bigint NOT NULL,
	"sku" varchar(30) NOT NULL,
	"batch_id" bigint,
	"qty_requested" numeric(14, 3) NOT NULL,
	"qty_dispatched" numeric(14, 3),
	"qty_received" numeric(14, 3),
	"discrepancy_qty" numeric(14, 3) GENERATED ALWAYS AS ((COALESCE(qty_dispatched, (0)::numeric) - COALESCE(qty_received, (0)::numeric))) STORED,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_adjustment" (
	"adjustment_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.stock_adjustment_adjustment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"location_code" varchar(10) NOT NULL,
	"sku" varchar(30) NOT NULL,
	"bin_code" varchar(20),
	"adjustment_type" "portal"."adjustment_type" NOT NULL,
	"qty_adjusted" numeric(14, 3) NOT NULL,
	"value_adjusted" numeric(16, 2),
	"reason" text NOT NULL,
	"requested_by" varchar(20),
	"approved_by" varchar(20),
	"adjustment_date" date DEFAULT CURRENT_DATE NOT NULL,
	"status" "portal"."approval_status" DEFAULT 'Pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."physical_count" (
	"count_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.physical_count_count_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"location_code" varchar(10) NOT NULL,
	"count_type" "portal"."count_type" NOT NULL,
	"count_date" date NOT NULL,
	"counted_by" varchar(20),
	"verified_by" varchar(20),
	"status" "portal"."count_status" DEFAULT 'Planned' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."physical_count_line" (
	"count_line_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.physical_count_line_count_line_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"count_id" bigint NOT NULL,
	"sku" varchar(30) NOT NULL,
	"bin_code" varchar(20) NOT NULL,
	"system_qty" numeric(14, 3) NOT NULL,
	"counted_qty" numeric(14, 3) NOT NULL,
	"variance_qty" numeric(14, 3) GENERATED ALWAYS AS ((counted_qty - system_qty)) STORED,
	"variance_value" numeric(16, 2),
	"adjustment_id" bigint
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_sheet" (
	"sheet_id" integer PRIMARY KEY NOT NULL,
	"sheet_name" varchar(80) NOT NULL,
	"source_file" varchar(120) NOT NULL,
	"sheet_order" smallint NOT NULL,
	"counted_on" date
);
--> statement-breakpoint
CREATE TABLE "portal"."new_request" (
	"request_id" varchar(20) PRIMARY KEY NOT NULL,
	"dept_code" varchar(20) NOT NULL,
	"raised_by" integer NOT NULL,
	"raised_on" date DEFAULT CURRENT_DATE NOT NULL,
	"product" varchar(160) NOT NULL,
	"brand" varchar(80),
	"specification" text,
	"qty" numeric(14, 3) NOT NULL,
	"uom" varchar(10),
	"estimated_price" numeric(14, 2),
	"category_code" varchar(10),
	"indent_id" varchar(20),
	"step" smallint DEFAULT 1 NOT NULL,
	"registered_sku" varchar(30),
	"status" "portal"."new_request_status" DEFAULT 'Submitted' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."pr_line" (
	"pr_line_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.pr_line_pr_line_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"pr_id" bigint NOT NULL,
	"indent_id" varchar(20),
	"indent_line_no" smallint,
	"sku" varchar(30),
	"specification" text,
	"uom" varchar(10),
	"qty_required" numeric(14, 3) NOT NULL,
	"estimated_unit_price" numeric(14, 2),
	"estimated_total" numeric(16, 2) GENERATED ALWAYS AS ((qty_required * COALESCE(estimated_unit_price, (0)::numeric))) STORED,
	"delivery_location" varchar(10),
	"install_space_id" varchar(30),
	"po_line_id" bigint,
	"line_status" "portal"."pr_line_status" DEFAULT 'Open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."purchase_requisition" (
	"pr_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.purchase_requisition_pr_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"pr_no" varchar(20) NOT NULL,
	"pr_type" "portal"."pr_type" NOT NULL,
	"raised_by_location" varchar(10),
	"dept_code" varchar(20) NOT NULL,
	"indent_id" varchar(20),
	"budget_code" varchar(30),
	"estimated_value" numeric(16, 2),
	"budget_available" numeric(16, 2),
	"justification" text,
	"raised_date" date DEFAULT CURRENT_DATE NOT NULL,
	"required_by_date" date,
	"stores_head_approval" varchar(20),
	"finance_approval" varchar(20),
	"principal_approval" varchar(20),
	"status" "portal"."pr_status" DEFAULT 'Draft' NOT NULL,
	CONSTRAINT "purchase_requisition_pr_no_key" UNIQUE("pr_no")
);
--> statement-breakpoint
CREATE TABLE "portal"."rfq" (
	"rfq_id" varchar(20) PRIMARY KEY NOT NULL,
	"pr_id" bigint,
	"indent_id" varchar(20),
	"sku" varchar(30) NOT NULL,
	"qty" numeric(14, 3) NOT NULL,
	"floated_on" date DEFAULT CURRENT_DATE NOT NULL,
	"due_date" date,
	"rfq_mode" "portal"."rfq_mode" DEFAULT 'Limited_Tender' NOT NULL,
	"min_quotes_required" smallint DEFAULT 3 NOT NULL,
	"criteria_set_id" varchar(20),
	"issued_by" integer,
	"status" "portal"."rfq_status" DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor_evaluation" (
	"evaluation_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.vendor_evaluation_evaluation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"rfq_id" varchar(20) NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"criteria_set_id" varchar(20) NOT NULL,
	"criteria_id" varchar(20) NOT NULL,
	"raw_value" varchar(60),
	"score" numeric(5, 2),
	"weighted_score" numeric(7, 3),
	"evaluated_by" varchar(20),
	"evaluation_date" date,
	"remarks" text,
	CONSTRAINT "vendor_evaluation_rfq_id_vendor_id_criteria_set_id_criteria_key" UNIQUE("criteria_id","criteria_set_id","rfq_id","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor_ranking" (
	"ranking_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.vendor_ranking_ranking_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"rfq_id" varchar(20) NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"total_weighted_score" numeric(8, 3),
	"rank" smallint,
	"technically_qualified" boolean DEFAULT false NOT NULL,
	"is_selected" boolean DEFAULT false NOT NULL,
	"selection_reason" text,
	"committee_approval_by" varchar(20),
	"approval_date" date,
	CONSTRAINT "vendor_ranking_rfq_id_vendor_id_key" UNIQUE("rfq_id","vendor_id"),
	CONSTRAINT "vendor_ranking_check" CHECK ((NOT is_selected) OR (rank = 1) OR (selection_reason IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "portal"."purchase_order" (
	"po_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.purchase_order_po_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"office_no" varchar(40) NOT NULL,
	"po_date" date DEFAULT CURRENT_DATE NOT NULL,
	"fy" varchar(9) NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"indent_id" varchar(20),
	"request_id" varchar(20),
	"rfq_id" varchar(20),
	"pr_id" bigint,
	"po_type" "portal"."po_type" DEFAULT 'Standard' NOT NULL,
	"delivery_location" varchar(10),
	"delivery_address" text,
	"expected_delivery_date" date,
	"advance_pct" numeric(5, 2),
	"prepared_by" integer,
	"approved_by" varchar(20),
	"approval_date" date,
	"vendor_acknowledged_date" date,
	"stage" "portal"."po_stage" DEFAULT 'Draft' NOT NULL,
	"deleted_by" integer,
	"budget_code" varchar(30),
	"facility_id" varchar(30),
	CONSTRAINT "purchase_order_office_no_key" UNIQUE("office_no")
);
--> statement-breakpoint
CREATE TABLE "portal"."po_terms" (
	"po_id" integer PRIMARY KEY NOT NULL,
	"taxes" varchar(60),
	"delivery_schedule" varchar(120),
	"warranty" varchar(120),
	"warranty_months" smallint,
	"jurisdiction" varchar(60),
	"payment_terms" varchar(160),
	"penalty_clause" text,
	"terms_conditions" text
);
--> statement-breakpoint
CREATE TABLE "portal"."po_amendment" (
	"amendment_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.po_amendment_amendment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"po_id" integer NOT NULL,
	"amendment_no" smallint NOT NULL,
	"amendment_date" date DEFAULT CURRENT_DATE NOT NULL,
	"change_type" "portal"."po_change_type" NOT NULL,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"approved_by" varchar(20),
	CONSTRAINT "po_amendment_po_id_amendment_no_key" UNIQUE("amendment_no","po_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."po_condition" (
	"condition_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.po_condition_condition_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"po_id" integer NOT NULL,
	"condition_text" varchar(300) NOT NULL,
	"due_date" date,
	"watched_by" varchar(20),
	"status" "portal"."condition_status" DEFAULT 'Open' NOT NULL,
	"met_on" date
);
--> statement-breakpoint
CREATE TABLE "portal"."po_alert" (
	"alert_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.po_alert_alert_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"po_id" integer NOT NULL,
	"condition_id" bigint,
	"alert_type" varchar(40) NOT NULL,
	"severity" "portal"."alert_severity" DEFAULT 'Warning' NOT NULL,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_to" varchar(20),
	"acknowledged_at" timestamp with time zone,
	"status" "portal"."alert_status" DEFAULT 'Open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."approval_log" (
	"approval_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.approval_log_approval_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"document_type" "portal"."matrix_doc_type" NOT NULL,
	"document_id" varchar(40) NOT NULL,
	"level" smallint NOT NULL,
	"approver_role" varchar(30),
	"approver_id" varchar(20),
	"action" "portal"."approval_action" NOT NULL,
	"action_date" timestamp with time zone DEFAULT now() NOT NULL,
	"comments" text
);
--> statement-breakpoint
CREATE TABLE "portal"."shipment" (
	"shipment_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.shipment_shipment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"po_id" integer NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"transporter_id" varchar(20),
	"dispatch_date" date,
	"lr_docket_no" varchar(60),
	"vehicle_no" varchar(20),
	"driver_name_contact" varchar(120),
	"e_way_bill_no" varchar(30),
	"no_of_packages" integer,
	"gross_weight_kg" numeric(10, 2),
	"freight_charges" numeric(12, 2),
	"freight_paid_by" "portal"."freight_paid_by",
	"insurance_ref" varchar(60),
	"expected_arrival_date" date,
	"actual_arrival_date" date,
	"status" "portal"."shipment_status" DEFAULT 'Dispatched' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."shipment_tracking" (
	"tracking_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.shipment_tracking_tracking_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"shipment_id" bigint NOT NULL,
	"event_time" timestamp with time zone DEFAULT now() NOT NULL,
	"location" varchar(120),
	"event_status" varchar(60),
	"updated_by" "portal"."tracking_source" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."gate_entry" (
	"gate_entry_id" varchar(20) PRIMARY KEY NOT NULL,
	"shipment_id" bigint,
	"entry_datetime" timestamp with time zone DEFAULT now() NOT NULL,
	"vehicle_no" varchar(20),
	"invoice_challan_no" varchar(60),
	"no_of_packages" integer,
	"security_staff_id" varchar(20),
	"status" "portal"."gate_status" DEFAULT 'Entered' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."grn" (
	"grn_id" varchar(20) PRIMARY KEY NOT NULL,
	"po_id" integer NOT NULL,
	"line_no" smallint NOT NULL,
	"shipment_id" bigint,
	"gate_entry_id" varchar(20),
	"vendor_invoice_no" varchar(60),
	"vendor_invoice_date" date,
	"received_on" date DEFAULT CURRENT_DATE NOT NULL,
	"receiving_location" varchar(10),
	"received_by" integer,
	"bin_code" varchar(20),
	"batch_id" bigint,
	"serial_nos" text,
	"qty_delivered" numeric(14, 3),
	"qty_received" numeric(14, 3) NOT NULL,
	"accepted_qty" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_rejected" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_short" numeric(14, 3) GENERATED ALWAYS AS ((COALESCE(qty_delivered, (0)::numeric) - qty_received)) STORED,
	"unit_price" numeric(14, 2),
	"accepted_value" numeric(16, 2) GENERATED ALWAYS AS ((accepted_qty * COALESCE(unit_price, (0)::numeric))) STORED,
	"inspection_required" boolean DEFAULT false NOT NULL,
	"warranty_start" date,
	"warranty_end" date,
	"status" "portal"."grn_status" DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."quality_inspection" (
	"inspection_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.quality_inspection_inspection_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"grn_id" varchar(20) NOT NULL,
	"inspection_date" date DEFAULT CURRENT_DATE NOT NULL,
	"inspected_by" varchar(20),
	"inspection_type" "portal"."inspection_kind" NOT NULL,
	"checklist_ref" varchar(80),
	"overall_result" "portal"."inspection_result",
	"remarks" text,
	"report_doc_id" uuid,
	CONSTRAINT "quality_inspection_grn_id_key" UNIQUE("grn_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."quality_inspection_line" (
	"inspection_line_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.quality_inspection_line_inspection_line_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"inspection_id" bigint NOT NULL,
	"parameter" varchar(120) NOT NULL,
	"expected_value" varchar(120),
	"observed_value" varchar(120),
	"result" "portal"."pass_fail" NOT NULL,
	"qty_accepted" numeric(14, 3),
	"qty_rejected" numeric(14, 3),
	"rejection_reason" varchar(160)
);
--> statement-breakpoint
CREATE TABLE "portal"."return_to_vendor" (
	"rtv_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.return_to_vendor_rtv_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"rtv_no" varchar(20) NOT NULL,
	"grn_id" varchar(20) NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"sku" varchar(30) NOT NULL,
	"qty_returned" numeric(14, 3) NOT NULL,
	"return_reason" "portal"."rtv_reason" NOT NULL,
	"return_action" "portal"."rtv_action" NOT NULL,
	"return_date" date,
	"transporter_id" varchar(20),
	"debit_note_id" bigint,
	"replacement_grn_id" varchar(20),
	"status" "portal"."rtv_status" DEFAULT 'Raised' NOT NULL,
	CONSTRAINT "return_to_vendor_rtv_no_key" UNIQUE("rtv_no")
);
--> statement-breakpoint
CREATE TABLE "portal"."deployment" (
	"deployment_id" varchar(20) PRIMARY KEY NOT NULL,
	"dept_code" varchar(20) NOT NULL,
	"po_id" integer,
	"grn_id" varchar(20),
	"sku" varchar(30) NOT NULL,
	"from_bin" varchar(20),
	"qty" numeric(14, 3) DEFAULT '1' NOT NULL,
	"serial_no" varchar(80),
	"custodian" varchar(120),
	"custodian_staff_id" varchar(20),
	"facility_id" varchar(30),
	"space_id" varchar(30),
	"subspace_id" varchar(30),
	"installed_by_type" "portal"."installed_by_type",
	"vendor_id" varchar(20),
	"technician_id" varchar(20),
	"scheduled_date" date,
	"site_readiness_checked" boolean DEFAULT false NOT NULL,
	"pre_install_checklist" text,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"installation_cost" numeric(12, 2),
	"status" "portal"."deployment_status" DEFAULT 'Requested' NOT NULL,
	"ticket_id" bigint
);
--> statement-breakpoint
CREATE TABLE "portal"."commissioning_handover" (
	"commission_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.commissioning_handover_commission_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"deployment_id" varchar(20) NOT NULL,
	"commissioning_date" date,
	"tested_by" varchar(20),
	"test_result" "portal"."test_result",
	"test_report_doc_id" uuid,
	"handed_over_to" varchar(20),
	"handover_date" date,
	"training_provided" boolean DEFAULT false NOT NULL,
	"user_manual_received" boolean DEFAULT false NOT NULL,
	"warranty_card_ref" varchar(80),
	"amc_id" varchar(30),
	"remarks" text,
	CONSTRAINT "commissioning_handover_deployment_id_key" UNIQUE("deployment_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."asset" (
	"asset_tag" varchar(40) PRIMARY KEY NOT NULL,
	"sku" varchar(30) NOT NULL,
	"serial_no" varchar(80),
	"dept_code" varchar(20),
	"deployment_id" varchar(20),
	"grn_id" varchar(20),
	"receipt_id" varchar(20),
	"asset_id" varchar(40),
	"status" "portal"."asset_tag_status" DEFAULT 'In_Store' NOT NULL,
	"space_id" varchar(30)
);
--> statement-breakpoint
CREATE TABLE "portal"."asset_capitalisation" (
	"capitalisation_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.asset_capitalisation_capitalisation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"asset_id" varchar(40) NOT NULL,
	"asset_tag" varchar(40),
	"deployment_id" varchar(20),
	"grn_id" varchar(20),
	"po_id" integer,
	"sku" varchar(30) NOT NULL,
	"serial_no" varchar(80),
	"space_id" varchar(30),
	"capitalisation_date" date NOT NULL,
	"purchase_cost" numeric(14, 2) NOT NULL,
	"freight_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"installation_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"capitalised_value" numeric(16, 2) GENERATED ALWAYS AS (((purchase_cost + freight_cost) + installation_cost)) STORED,
	"depreciation_method" "portal"."depreciation_method",
	"useful_life_years" smallint,
	"salvage_value" numeric(14, 2),
	"asset_gl_account_id" varchar(20),
	"custodian_id" varchar(20),
	"status" "portal"."capitalisation_status" DEFAULT 'Capitalised' NOT NULL,
	CONSTRAINT "asset_capitalisation_asset_id_key" UNIQUE("asset_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."asset_transfer" (
	"asset_transfer_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.asset_transfer_asset_transfer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"asset_id" varchar(40) NOT NULL,
	"from_space_id" varchar(30),
	"to_space_id" varchar(30),
	"from_dept" varchar(20),
	"to_dept" varchar(20),
	"transfer_date" date DEFAULT CURRENT_DATE NOT NULL,
	"reason" text,
	"approved_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "portal"."amc_renewal" (
	"renewal_id" varchar(20) PRIMARY KEY NOT NULL,
	"sku" varchar(30) NOT NULL,
	"location_code" varchar(10) NOT NULL,
	"amc_id" varchar(30),
	"requested_by" integer,
	"old_expiry" date,
	"new_expiry" date,
	"cost" numeric(12, 2),
	"status" "portal"."amc_renewal_status" DEFAULT 'Proposed' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."service_ticket" (
	"ticket_id" varchar(20) PRIMARY KEY NOT NULL,
	"asset_tag" varchar(40) NOT NULL,
	"issue" varchar(200) NOT NULL,
	"priority" "infra"."priority" DEFAULT 'Medium' NOT NULL,
	"opened_by" integer,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"maintenance_ticket_id" bigint,
	"status" "portal"."service_ticket_status" DEFAULT 'Open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."budget_txn" (
	"budget_txn_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.budget_txn_budget_txn_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"budget_code" varchar(30) NOT NULL,
	"txn_type" "portal"."budget_txn_type" NOT NULL,
	"reference_type" "portal"."budget_ref_type" NOT NULL,
	"reference_id" varchar(40) NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"txn_date" date DEFAULT CURRENT_DATE NOT NULL,
	"posted_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor_invoice" (
	"invoice_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.vendor_invoice_invoice_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"invoice_no" varchar(60) NOT NULL,
	"invoice_date" date NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"po_id" integer,
	"grn_id" varchar(20),
	"received_date" date,
	"basic_amount" numeric(16, 2) NOT NULL,
	"discount_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"cgst_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"sgst_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"igst_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"freight_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"other_charges" numeric(16, 2) DEFAULT '0' NOT NULL,
	"invoice_total" numeric(16, 2) GENERATED ALWAYS AS (((((((basic_amount - discount_amount) + cgst_amount) + sgst_amount) + igst_amount) + freight_amount) + other_charges)) STORED,
	"tds_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"retention_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"advance_adjusted" numeric(16, 2) DEFAULT '0' NOT NULL,
	"net_payable" numeric(16, 2) GENERATED ALWAYS AS ((((((((((basic_amount - discount_amount) + cgst_amount) + sgst_amount) + igst_amount) + freight_amount) + other_charges) - tds_amount) - retention_amount) - advance_adjusted)) STORED,
	"due_date" date,
	"three_way_match_status" "portal"."three_way_match",
	"verified_by" varchar(20),
	"approved_by" varchar(20),
	"doc_id" uuid,
	"status" "portal"."invoice_status" DEFAULT 'Received' NOT NULL,
	CONSTRAINT "vendor_invoice_vendor_id_invoice_no_key" UNIQUE("invoice_no","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor_invoice_line" (
	"invoice_line_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.vendor_invoice_line_invoice_line_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"invoice_id" bigint NOT NULL,
	"po_line_id" bigint,
	"grn_id" varchar(20),
	"sku" varchar(30) NOT NULL,
	"qty_invoiced" numeric(14, 3) NOT NULL,
	"qty_accepted" numeric(14, 3),
	"unit_price" numeric(14, 2) NOT NULL,
	"po_unit_price" numeric(14, 2),
	"price_variance" numeric(14, 2) GENERATED ALWAYS AS ((unit_price - COALESCE(po_unit_price, unit_price))) STORED,
	"tax_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(16, 2) GENERATED ALWAYS AS (round(((qty_invoiced * unit_price) * ((1)::numeric + (tax_pct / (100)::numeric))), 2)) STORED,
	"gl_account_id" varchar(20),
	"budget_code" varchar(30)
);
--> statement-breakpoint
CREATE TABLE "portal"."po_payment" (
	"payment_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.po_payment_payment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"payment_no" varchar(30),
	"po_id" integer,
	"vendor_id" varchar(20) NOT NULL,
	"invoice_no" varchar(60),
	"invoice_date" date,
	"invoice_amount" numeric(16, 2),
	"payment_date" date,
	"payment_type" "portal"."payment_type" DEFAULT 'Against_Invoice' NOT NULL,
	"mode" "portal"."payment_mode",
	"bank_account_id" varchar(20),
	"transaction_ref" varchar(60),
	"gross_amount" numeric(16, 2) NOT NULL,
	"tds_deducted" numeric(16, 2) DEFAULT '0' NOT NULL,
	"penalty_deducted" numeric(16, 2) DEFAULT '0' NOT NULL,
	"net_paid" numeric(16, 2) GENERATED ALWAYS AS (((gross_amount - tds_deducted) - penalty_deducted)) STORED,
	"prepared_by" varchar(20),
	"approved_by" varchar(20),
	"status" "portal"."payment_status" DEFAULT 'Draft' NOT NULL,
	CONSTRAINT "po_payment_payment_no_key" UNIQUE("payment_no")
);
--> statement-breakpoint
CREATE TABLE "portal"."advance_payment" (
	"advance_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.advance_payment_advance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"po_id" integer NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"advance_amount" numeric(16, 2) NOT NULL,
	"advance_date" date NOT NULL,
	"payment_id" bigint,
	"adjusted_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"balance_amount" numeric(16, 2) GENERATED ALWAYS AS ((advance_amount - adjusted_amount)) STORED,
	"bank_guarantee_ref" varchar(60),
	"status" "portal"."advance_status" DEFAULT 'Paid' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."payment_allocation" (
	"allocation_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.payment_allocation_allocation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"payment_id" bigint NOT NULL,
	"invoice_id" bigint NOT NULL,
	"advance_id" bigint,
	"amount_allocated" numeric(16, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."debit_note" (
	"note_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.debit_note_note_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"note_type" "portal"."note_type" NOT NULL,
	"note_no" varchar(30) NOT NULL,
	"note_date" date DEFAULT CURRENT_DATE NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"invoice_id" bigint,
	"rtv_id" bigint,
	"reason" "portal"."note_reason" NOT NULL,
	"basic_amount" numeric(16, 2) NOT NULL,
	"tax_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(16, 2) GENERATED ALWAYS AS ((basic_amount + tax_amount)) STORED,
	"status" "portal"."note_status" DEFAULT 'Raised' NOT NULL,
	CONSTRAINT "debit_note_note_no_key" UNIQUE("note_no")
);
--> statement-breakpoint
CREATE TABLE "portal"."journal_entry" (
	"journal_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.journal_entry_journal_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"journal_date" date DEFAULT CURRENT_DATE NOT NULL,
	"source_type" "portal"."journal_source" NOT NULL,
	"source_id" varchar(40) NOT NULL,
	"narration" text,
	"posted_by" varchar(20),
	"status" "portal"."journal_status" DEFAULT 'Draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal"."journal_line" (
	"journal_line_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.journal_line_journal_line_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"journal_id" bigint NOT NULL,
	"gl_account_id" varchar(20) NOT NULL,
	"dept_code" varchar(20),
	"budget_code" varchar(30),
	"debit_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	"credit_amount" numeric(16, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "journal_line_check" CHECK ((debit_amount >= (0)::numeric) AND (credit_amount >= (0)::numeric) AND ((debit_amount = (0)::numeric) OR (credit_amount = (0)::numeric)))
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor_performance" (
	"perf_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.vendor_performance_perf_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"vendor_id" varchar(20) NOT NULL,
	"po_id" integer,
	"on_time_delivery" boolean,
	"delay_days" integer,
	"quality_score" numeric(3, 1),
	"rejection_pct" numeric(5, 2),
	"invoice_accuracy" boolean,
	"service_response_score" numeric(3, 1),
	"composite_score" numeric(4, 2),
	"recorded_by" varchar(20),
	"recorded_date" date DEFAULT CURRENT_DATE NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared"."approval_step" (
	"step_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shared"."shared.approval_step_step_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"request_type" "shared"."request_type" NOT NULL,
	"request_id" bigint NOT NULL,
	"level" smallint NOT NULL,
	"rule_id" bigint,
	"approver_role" varchar(30) NOT NULL,
	"acted_by" varchar(20),
	"acted_by_contact" bigint,
	"decision" "shared"."decision" DEFAULT 'Pending' NOT NULL,
	"decided_on" timestamp with time zone,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_step_request_type_request_id_level_key" UNIQUE("level","request_id","request_type"),
	CONSTRAINT "approval_step_check" CHECK ((decision = 'Pending'::shared.decision) OR (decided_on IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "shared"."policy_setting" (
	"setting_key" varchar(60) PRIMARY KEY NOT NULL,
	"module" varchar(20) DEFAULT 'hostel' NOT NULL,
	"amount" numeric(16, 2),
	"value_text" varchar(200),
	"meaning" varchar(300) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "shared"."document" (
	"doc_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "shared"."document_kind" NOT NULL,
	"file_name" varchar(200) NOT NULL,
	"object_key" varchar(300) NOT NULL,
	"mime_type" varchar(80),
	"size_bytes" bigint,
	"sha256" char(64),
	"attached_to" varchar(40),
	"attached_id" varchar(40),
	"uploaded_by" varchar(20),
	"uploaded_by_student" varchar(20),
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared"."import_batch" (
	"batch_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shared"."shared.import_batch_batch_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"source" "shared"."import_source" NOT NULL,
	"file_name" varchar(200),
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rows_total" integer,
	"rows_ok" integer,
	"rows_failed" integer,
	"status" "shared"."import_status" DEFAULT 'Received' NOT NULL,
	"processed_by" varchar(20),
	"error_report" text
);
--> statement-breakpoint
CREATE TABLE "shared"."approval_rule" (
	"rule_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shared"."shared.approval_rule_rule_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"request_type" "shared"."request_type" NOT NULL,
	"level" smallint NOT NULL,
	"approver_role" varchar(30) NOT NULL,
	"condition_key" varchar(40),
	"condition_value" varchar(40),
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"sla_hours" integer,
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL,
	CONSTRAINT "approval_rule_request_type_level_condition_key_condition_va_key" UNIQUE("condition_key","condition_value","level","request_type")
);
--> statement-breakpoint
CREATE TABLE "shared"."notification" (
	"notification_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shared"."shared.notification_notification_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"recipient_type" "shared"."recipient_type" NOT NULL,
	"student_id" varchar(20),
	"contact_id" bigint,
	"staff_id" varchar(20),
	"channel" "shared"."channel" NOT NULL,
	"template_code" varchar(40),
	"subject" varchar(200),
	"body" text NOT NULL,
	"related_type" varchar(40),
	"related_id" varchar(40),
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"delivery_status" "shared"."delivery_status" DEFAULT 'Queued' NOT NULL,
	"provider_ref" varchar(80),
	"error_text" text
);
--> statement-breakpoint
CREATE TABLE "hostel"."mess_master" (
	"mess_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.mess_master_mess_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"mess_name" varchar(80) NOT NULL,
	"facility_id" varchar(30),
	"space_id" varchar(30),
	"incharge_id" varchar(20),
	"capacity" integer,
	"annual_fee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostel"."hostel_profile" (
	"facility_id" varchar(30) PRIMARY KEY NOT NULL,
	"hostel_code" varchar(10) NOT NULL,
	"hostel_gender" "hostel"."hostel_gender" NOT NULL,
	"default_mess_id" bigint,
	"sub_store_code" varchar(10),
	"dept_code" varchar(20) NOT NULL,
	"gate_close_time" time DEFAULT '21:30:00' NOT NULL,
	"status" "hostel"."hostel_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "hostel_profile_hostel_code_key" UNIQUE("hostel_code")
);
--> statement-breakpoint
CREATE TABLE "hostel"."student_contact" (
	"contact_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.student_contact_contact_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" varchar(20) NOT NULL,
	"relation" "hostel"."contact_relation" NOT NULL,
	"contact_name" varchar(120) NOT NULL,
	"mobile_no" varchar(10) NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_on" timestamp with time zone,
	"is_outpass_approver" boolean DEFAULT false NOT NULL,
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "student_contact_student_id_relation_mobile_no_key" UNIQUE("mobile_no","relation","student_id"),
	CONSTRAINT "student_contact_mobile_no_check" CHECK ((mobile_no)::text ~ '^[6-9][0-9]{9}$'::text)
);
--> statement-breakpoint
CREATE TABLE "hostel"."room_type" (
	"room_type_id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.room_type_room_type_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"type_name" varchar(60) NOT NULL,
	"sharing_count" smallint NOT NULL,
	"is_ac" boolean DEFAULT false NOT NULL,
	"attached_bath" boolean DEFAULT false NOT NULL,
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL,
	CONSTRAINT "room_type_type_name_key" UNIQUE("type_name"),
	CONSTRAINT "room_type_sharing_count_check" CHECK ((sharing_count >= 1) AND (sharing_count <= 8))
);
--> statement-breakpoint
CREATE TABLE "hostel"."room_type_fee" (
	"fee_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.room_type_fee_fee_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"room_type_id" smallint NOT NULL,
	"facility_id" varchar(30) NOT NULL,
	"academic_year" varchar(9) NOT NULL,
	"registration_fee" numeric(12, 2) NOT NULL,
	"hostel_fee" numeric(12, 2) NOT NULL,
	"instalment_1_pct" numeric(5, 2) DEFAULT '50' NOT NULL,
	"instalment_2_due_date" date NOT NULL,
	CONSTRAINT "room_type_fee_room_type_id_facility_id_academic_year_key" UNIQUE("academic_year","facility_id","room_type_id"),
	CONSTRAINT "room_type_fee_instalment_1_pct_check" CHECK ((instalment_1_pct >= (1)::numeric) AND (instalment_1_pct <= (100)::numeric))
);
--> statement-breakpoint
CREATE TABLE "hostel"."academic_year" (
	"academic_year" varchar(9) PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	CONSTRAINT "academic_year_check" CHECK (end_date > start_date)
);
--> statement-breakpoint
CREATE TABLE "hostel"."room_profile" (
	"space_id" varchar(30) PRIMARY KEY NOT NULL,
	"room_type_id" smallint NOT NULL,
	"reserved_for" "hostel"."reserved_for" DEFAULT 'None' NOT NULL,
	"is_accessible" boolean DEFAULT false NOT NULL,
	"nearest_point_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "hostel"."mess_subscription" (
	"subscription_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.mess_subscription_subscription_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" varchar(20) NOT NULL,
	"mess_id" bigint NOT NULL,
	"academic_year" varchar(9) NOT NULL,
	"cuisine" "hostel"."cuisine" NOT NULL,
	"mess_demand_id" bigint,
	"from_date" date DEFAULT CURRENT_DATE NOT NULL,
	"to_date" date,
	"status" "hostel"."subscription_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "hostel"."discipline_case" (
	"case_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.discipline_case_case_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" varchar(20) NOT NULL,
	"incident_on" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"reported_by" varchar(20),
	"status" varchar(20) DEFAULT 'Open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "hostel"."discipline_punishment" (
	"punishment_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.discipline_punishment_punishment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"case_id" bigint NOT NULL,
	"student_id" varchar(20) NOT NULL,
	"punishment_type" "hostel"."punishment_type" NOT NULL,
	"bars_outings" boolean DEFAULT false NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date,
	"fine_amount" numeric(12, 2),
	"awarded_by" varchar(20),
	"status" "hostel"."punishment_status" DEFAULT 'In_Force' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "hostel"."vacate_request" (
	"vacate_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.vacate_request_vacate_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" varchar(20) NOT NULL,
	"hostel_alloc_id" bigint,
	"reason" "hostel"."vacate_reason" NOT NULL,
	"reason_detail" text,
	"proof_doc_id" uuid,
	"planned_date" date NOT NULL,
	"applied_on" timestamp with time zone DEFAULT now() NOT NULL,
	"levels_required" smallint DEFAULT 4 NOT NULL,
	"status" "hostel"."vacate_status" DEFAULT 'Applied' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "hostel"."no_dues_clearance" (
	"clearance_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.no_dues_clearance_clearance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"vacate_id" bigint NOT NULL,
	"section" "hostel"."clearance_section" NOT NULL,
	"dues_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"demand_id" bigint,
	"cleared_by" varchar(20),
	"cleared_on" timestamp with time zone,
	"remarks" text,
	"status" "hostel"."clearance_status" DEFAULT 'Pending' NOT NULL,
	CONSTRAINT "no_dues_clearance_vacate_id_section_key" UNIQUE("section","vacate_id")
);
--> statement-breakpoint
CREATE TABLE "hostel"."hostel_registration" (
	"registration_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.hostel_registration_registration_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"registration_no" varchar(20),
	"student_id" varchar(20) NOT NULL,
	"academic_year" varchar(9) NOT NULL,
	"facility_id" varchar(30) NOT NULL,
	"room_type_id" smallint NOT NULL,
	"applied_on" timestamp with time zone DEFAULT now() NOT NULL,
	"reg_demand_id" bigint,
	"rules_accepted" boolean DEFAULT false NOT NULL,
	"waitlist_no" integer,
	"status" "hostel"."registration_status" DEFAULT 'Applied' NOT NULL,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "hostel_registration_registration_no_key" UNIQUE("registration_no"),
	CONSTRAINT "hostel_registration_student_id_academic_year_key" UNIQUE("academic_year","student_id"),
	CONSTRAINT "ck_reg_no_present" CHECK (registration_no IS NOT NULL)) NOT VALID),
	CONSTRAINT "hostel_registration_rules_accepted_check" CHECK (CHECK (rules_accepted))
);
--> statement-breakpoint
CREATE TABLE "hostel"."hostel_allocation" (
	"hostel_alloc_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.hostel_allocation_hostel_alloc_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"occupant_type" "hostel"."occupant_type" DEFAULT 'Student' NOT NULL,
	"student_id" varchar(20),
	"staff_id" varchar(20),
	"subspace_id" varchar(30) NOT NULL,
	"offer_id" bigint,
	"academic_year" varchar(9) NOT NULL,
	"allocation_date" date DEFAULT CURRENT_DATE NOT NULL,
	"vacate_date" date,
	"key_no" varchar(20) NOT NULL,
	"checked_in_by" varchar(20) NOT NULL,
	"approved_by" varchar(20),
	"status" "hostel"."allocation_status" DEFAULT 'Active' NOT NULL,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "hostel_allocation_check" CHECK (((occupant_type = 'Student'::hostel.occupant_type) AND (student_id IS NOT NULL) AND (staff_id IS NULL)) OR ((occupant_type = 'Staff'::hostel.occupant_type) AND (staff_id IS NOT NULL) AND (student_id IS NULL))),
	CONSTRAINT "hostel_allocation_check1" CHECK ((vacate_date IS NULL) OR (vacate_date >= allocation_date)),
	CONSTRAINT "hostel_allocation_check2" CHECK ((status <> 'Active'::hostel.allocation_status) OR (vacate_date IS NULL))
);
--> statement-breakpoint
CREATE TABLE "hostel"."room_offer" (
	"offer_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.room_offer_offer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"registration_id" bigint NOT NULL,
	"subspace_id" varchar(30) NOT NULL,
	"offer_no" smallint NOT NULL,
	"offered_on" timestamp with time zone DEFAULT now() NOT NULL,
	"hold_until" timestamp with time zone NOT NULL,
	"offered_by" varchar(20),
	"student_decision" "hostel"."student_decision" DEFAULT 'Pending' NOT NULL,
	"decision_on" timestamp with time zone,
	"decline_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "room_offer_registration_id_offer_no_key" UNIQUE("offer_no","registration_id"),
	CONSTRAINT "room_offer_check" CHECK ((student_decision <> 'Declined'::hostel.student_decision) OR (decline_reason IS NOT NULL)),
	CONSTRAINT "room_offer_check1" CHECK (hold_until > offered_on)
);
--> statement-breakpoint
CREATE TABLE "hostel"."room_handover" (
	"handover_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.room_handover_handover_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"hostel_alloc_id" bigint NOT NULL,
	"vacate_id" bigint,
	"handover_type" "hostel"."handover_type" NOT NULL,
	"handover_on" timestamp with time zone DEFAULT now() NOT NULL,
	"meter_reading" numeric(12, 2) NOT NULL,
	"key_returned" boolean,
	"done_by" varchar(20) NOT NULL,
	"occupant_acknowledged" boolean DEFAULT false NOT NULL,
	"total_damage_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "room_handover_hostel_alloc_id_handover_type_key" UNIQUE("handover_type","hostel_alloc_id"),
	CONSTRAINT "room_handover_check" CHECK ((handover_type <> 'Check_Out'::hostel.handover_type) OR ((key_returned IS NOT NULL) AND (vacate_id IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "hostel"."fee_plan" (
	"fee_plan_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.fee_plan_fee_plan_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"registration_id" bigint NOT NULL,
	"plan_type" "hostel"."plan_type" NOT NULL,
	"fee_id" bigint NOT NULL,
	"created_on" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "hostel"."plan_status" DEFAULT 'Open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "fee_plan_registration_id_key" UNIQUE("registration_id")
);
--> statement-breakpoint
CREATE TABLE "hostel"."fee_demand" (
	"demand_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.fee_demand_demand_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" varchar(20) NOT NULL,
	"fee_plan_id" bigint,
	"fee_head" "hostel"."fee_head" NOT NULL,
	"instalment_no" smallint DEFAULT 1 NOT NULL,
	"amount_due" numeric(12, 2) NOT NULL,
	"due_date" date NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" "hostel"."demand_status" DEFAULT 'Pending' NOT NULL,
	"reference_type" varchar(30),
	"reference_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "fee_demand_amount_due_check" CHECK (amount_due >= (0)::numeric),
	CONSTRAINT "fee_demand_check" CHECK ((fee_head = 'Hostel'::hostel.fee_head) OR (instalment_no = 1)),
	CONSTRAINT "fee_demand_instalment_no_check" CHECK (instalment_no = ANY (ARRAY[1, 2]))
);
--> statement-breakpoint
CREATE TABLE "hostel"."staff_space_assignment" (
	"assignment_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.staff_space_assignment_assignment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"staff_id" varchar(20) NOT NULL,
	"hostel_role" varchar(30) NOT NULL,
	"facility_id" varchar(30) NOT NULL,
	"zone_id" varchar(30),
	"space_id" varchar(30),
	"shift" "hostel"."shift" DEFAULT 'General' NOT NULL,
	"from_date" date DEFAULT CURRENT_DATE NOT NULL,
	"to_date" date,
	"show_on_qr" boolean DEFAULT false NOT NULL,
	"status" "hostel"."assignment_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "staff_space_assignment_check" CHECK ((to_date IS NULL) OR (to_date >= from_date)),
	CONSTRAINT "staff_space_assignment_check1" CHECK ((status = 'Active'::hostel.assignment_status) OR (to_date IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "hostel"."space_qr" (
	"qr_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.space_qr_qr_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"space_id" varchar(30) NOT NULL,
	"qr_token" varchar(64) DEFAULT encode(gen_random_bytes(24), 'hex'::text) NOT NULL,
	"generated_on" timestamp with time zone DEFAULT now() NOT NULL,
	"printed_on" timestamp with time zone,
	"status" "hostel"."qr_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "space_qr_qr_token_key" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "hostel"."room_meter" (
	"meter_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.room_meter_meter_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"space_id" varchar(30) NOT NULL,
	"meter_no" varchar(40) NOT NULL,
	"meter_type" "hostel"."meter_type" NOT NULL,
	"device_ref" varchar(80),
	"installed_on" date NOT NULL,
	"asset_id" varchar(40),
	"status" "hostel"."meter_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "room_meter_meter_no_key" UNIQUE("meter_no"),
	CONSTRAINT "room_meter_check" CHECK ((meter_type <> 'Smart_Prepaid'::hostel.meter_type) OR (device_ref IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "hostel"."electricity_tariff" (
	"tariff_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.electricity_tariff_tariff_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"room_type_id" smallint NOT NULL,
	"included_units_per_month" numeric(10, 2) NOT NULL,
	"rate_per_unit" numeric(8, 2) NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"approved_by" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "hostel"."meter_student_map" (
	"map_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.meter_student_map_map_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"meter_id" bigint NOT NULL,
	"hostel_alloc_id" bigint NOT NULL,
	"from_datetime" timestamp with time zone DEFAULT now() NOT NULL,
	"to_datetime" timestamp with time zone,
	"share_pct" numeric(5, 2) DEFAULT '100' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "meter_student_map_hostel_alloc_id_key" UNIQUE("hostel_alloc_id"),
	CONSTRAINT "meter_student_map_check" CHECK ((to_datetime IS NULL) OR (to_datetime >= from_datetime)),
	CONSTRAINT "meter_student_map_share_pct_check" CHECK ((share_pct > (0)::numeric) AND (share_pct <= (100)::numeric))
);
--> statement-breakpoint
CREATE TABLE "hostel"."fee_receipt" (
	"receipt_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.fee_receipt_receipt_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"receipt_no" varchar(20),
	"demand_id" bigint NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_on" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_mode" "hostel"."payment_mode" NOT NULL,
	"gateway_ref" varchar(80),
	"gateway_status" "hostel"."gateway_status" DEFAULT 'Pending' NOT NULL,
	"is_refundable" boolean DEFAULT true NOT NULL,
	"collected_by" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	CONSTRAINT "fee_receipt_receipt_no_key" UNIQUE("receipt_no"),
	CONSTRAINT "ck_receipt_no_present" CHECK (receipt_no IS NOT NULL)) NOT VALID),
	CONSTRAINT "fee_receipt_amount_check" CHECK (amount > (0)::numeric),
	CONSTRAINT "fee_receipt_check" CHECK ((payment_mode <> ALL (ARRAY['UPI'::hostel.payment_mode, 'Card'::hostel.payment_mode, 'Net_Banking'::hostel.payment_mode])) OR (gateway_ref IS NOT NULL)),
	CONSTRAINT "fee_receipt_check1" CHECK ((payment_mode <> 'Cash'::hostel.payment_mode) OR (collected_by IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "hostel"."meter_reading" (
	"reading_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.meter_reading_reading_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"meter_id" bigint NOT NULL,
	"reading_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reading_kwh" numeric(12, 2) NOT NULL,
	"source" "hostel"."reading_source" NOT NULL,
	"read_by" varchar(20),
	"handover_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	CONSTRAINT "meter_reading_meter_id_reading_at_key" UNIQUE("meter_id","reading_at"),
	CONSTRAINT "meter_reading_check" CHECK ((source <> 'Manual'::hostel.reading_source) OR (read_by IS NOT NULL)),
	CONSTRAINT "meter_reading_reading_kwh_check" CHECK (reading_kwh >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "hostel"."meter_recharge" (
	"recharge_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.meter_recharge_recharge_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"meter_id" bigint NOT NULL,
	"student_id" varchar(20) NOT NULL,
	"receipt_id" bigint NOT NULL,
	"units_credited" numeric(10, 2) NOT NULL,
	"pushed_to_meter" boolean DEFAULT false NOT NULL,
	"push_ref" varchar(80),
	"push_attempts" smallint DEFAULT 0 NOT NULL,
	"status" "hostel"."recharge_status" DEFAULT 'Paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "meter_recharge_receipt_id_key" UNIQUE("receipt_id")
);
--> statement-breakpoint
CREATE TABLE "hostel"."tracking_consent" (
	"consent_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.tracking_consent_consent_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" varchar(20) NOT NULL,
	"given_by" "hostel"."consent_given_by" NOT NULL,
	"contact_id" bigint,
	"policy_version" varchar(20) NOT NULL,
	"given_on" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_on" timestamp with time zone,
	"recorded_by" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "tracking_consent_check" CHECK ((given_by <> 'Parent'::hostel.consent_given_by) OR (contact_id IS NOT NULL)),
	CONSTRAINT "tracking_consent_check1" CHECK ((withdrawn_on IS NULL) OR (withdrawn_on >= given_on))
);
--> statement-breakpoint
CREATE TABLE "hostel"."capture_point" (
	"point_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.capture_point_point_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"point_name" varchar(120) NOT NULL,
	"point_type" "hostel"."point_type" NOT NULL,
	"facility_id" varchar(30) NOT NULL,
	"zone_id" varchar(30),
	"space_id" varchar(30),
	"device_type" "hostel"."device_type" NOT NULL,
	"device_ref" varchar(80),
	"status" "hostel"."device_status" DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "hostel"."student_current_status" (
	"student_id" varchar(20) PRIMARY KEY NOT NULL,
	"current_status" "hostel"."current_status" DEFAULT 'Not_Seen' NOT NULL,
	"last_event_id" bigint,
	"last_event_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostel"."hostel_alert" (
	"alert_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.hostel_alert_alert_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"alert_type" "hostel"."alert_type" NOT NULL,
	"student_id" varchar(20),
	"facility_id" varchar(30) NOT NULL,
	"related_type" varchar(40),
	"related_id" bigint,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"severity" "hostel"."severity" DEFAULT 'Warning' NOT NULL,
	"assigned_to" varchar(20),
	"parent_informed" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"action_taken" text,
	"status" "hostel"."alert_status" DEFAULT 'Open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "hostel_alert_check" CHECK ((status <> 'Closed'::hostel.alert_status) OR (action_taken IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "hostel"."location_access_log" (
	"log_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.location_access_log_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"viewer_staff_id" varchar(20) NOT NULL,
	"student_id" varchar(20) NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purpose" "hostel"."access_purpose" NOT NULL,
	"alert_id" bigint
);
--> statement-breakpoint
CREATE TABLE "hostel"."sick_leave" (
	"sick_leave_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.sick_leave_sick_leave_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" varchar(20) NOT NULL,
	"illness_details" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"applied_on" timestamp with time zone DEFAULT now() NOT NULL,
	"medical_doc_id" uuid,
	"visited_by" varchar(20),
	"visited_at" timestamp with time zone,
	"visit_remarks" text,
	"room_meals_required" boolean DEFAULT false NOT NULL,
	"extended_from_id" bigint,
	"approved_by" varchar(20),
	"closed_on" date,
	"status" "hostel"."sick_leave_status" DEFAULT 'Applied' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "sick_leave_check" CHECK (to_date >= from_date),
	CONSTRAINT "sick_leave_check1" CHECK ((status = ANY (ARRAY['Applied'::hostel.sick_leave_status, 'Rejected'::hostel.sick_leave_status])) OR ((visited_by IS NOT NULL) AND (visited_at IS NOT NULL) AND (visit_remarks IS NOT NULL))),
	CONSTRAINT "sick_leave_check2" CHECK ((status <> 'Approved'::hostel.sick_leave_status) OR (approved_by IS NOT NULL)),
	CONSTRAINT "sick_leave_check3" CHECK ((status <> 'Closed'::hostel.sick_leave_status) OR (closed_on IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "hostel"."outpass" (
	"outpass_id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."hostel.outpass_outpass_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"outpass_no" varchar(20),
	"student_id" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"destination" varchar(200) NOT NULL,
	"leave_from" timestamp with time zone NOT NULL,
	"return_by" timestamp with time zone NOT NULL,
	"outing_category" "hostel"."outing_category" NOT NULL,
	"levels_required" smallint NOT NULL,
	"contact_during_leave" varchar(15) NOT NULL,
	"applied_on" timestamp with time zone DEFAULT now() NOT NULL,
	"qr_token" varchar(64),
	"actual_out_event_id" bigint,
	"actual_in_event_id" bigint,
	"actual_out_at" timestamp with time zone,
	"actual_in_at" timestamp with time zone,
	"late_by_minutes" integer,
	"status" "hostel"."outpass_status" DEFAULT 'Applied' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "outpass_outpass_no_key" UNIQUE("outpass_no"),
	CONSTRAINT "outpass_qr_token_key" UNIQUE("qr_token"),
	CONSTRAINT "ck_outpass_no_present" CHECK (outpass_no IS NOT NULL)) NOT VALID),
	CONSTRAINT "outpass_check" CHECK (return_by > leave_from),
	CONSTRAINT "outpass_check1" CHECK ((status <> ALL (ARRAY['Approved'::hostel.outpass_status, 'Out'::hostel.outpass_status, 'Returned'::hostel.outpass_status, 'Overdue'::hostel.outpass_status])) OR (qr_token IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor_category" (
	"vendor_id" varchar(20) NOT NULL,
	"category_code" varchar(10) NOT NULL,
	CONSTRAINT "vendor_category_pkey" PRIMARY KEY("category_code","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor_tag" (
	"vendor_id" varchar(20) NOT NULL,
	"tag" varchar(40) NOT NULL,
	CONSTRAINT "vendor_tag_pkey" PRIMARY KEY("tag","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."material_alias" (
	"sku" varchar(30) NOT NULL,
	"alias" varchar(80) NOT NULL,
	CONSTRAINT "material_alias_pkey" PRIMARY KEY("alias","sku")
);
--> statement-breakpoint
CREATE TABLE "portal"."bom_component" (
	"parent_sku" varchar(30) NOT NULL,
	"component_sku" varchar(30) NOT NULL,
	"qty" numeric(14, 3) NOT NULL,
	CONSTRAINT "bom_component_pkey" PRIMARY KEY("component_sku","parent_sku")
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_entry_finding" (
	"entry_id" varchar(20) NOT NULL,
	"finding_no" smallint NOT NULL,
	"finding" varchar(200) NOT NULL,
	CONSTRAINT "stock_entry_finding_pkey" PRIMARY KEY("entry_id","finding_no")
);
--> statement-breakpoint
CREATE TABLE "hostel"."room_standard_inventory" (
	"room_type_id" smallint NOT NULL,
	"sku" varchar(30) NOT NULL,
	"qty_per_room" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "room_standard_inventory_pkey" PRIMARY KEY("room_type_id","sku")
);
--> statement-breakpoint
CREATE TABLE "hostel"."doc_counter" (
	"prefix" varchar(5) NOT NULL,
	"year" smallint NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "doc_counter_pkey" PRIMARY KEY("prefix","year")
);
--> statement-breakpoint
CREATE TABLE "portal"."material_standard_rate" (
	"sku" varchar(30) NOT NULL,
	"applicable_from" date NOT NULL,
	"buying_rate" numeric(14, 2),
	"selling_rate" numeric(14, 2),
	CONSTRAINT "material_standard_rate_pkey" PRIMARY KEY("applicable_from","sku")
);
--> statement-breakpoint
CREATE TABLE "portal"."opening_stock" (
	"batch_id" bigint NOT NULL,
	"location_code" varchar(10) NOT NULL,
	"opening_qty" numeric(14, 3) NOT NULL,
	"opening_rate" numeric(14, 2),
	CONSTRAINT "opening_stock_pkey" PRIMARY KEY("batch_id","location_code")
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_reservation" (
	"indent_id" varchar(20) NOT NULL,
	"sku" varchar(30) NOT NULL,
	"bin_code" varchar(20) NOT NULL,
	"qty" numeric(14, 3) NOT NULL,
	CONSTRAINT "stock_reservation_pkey" PRIMARY KEY("bin_code","indent_id","sku")
);
--> statement-breakpoint
CREATE TABLE "portal"."rfq_vendor" (
	"rfq_id" varchar(20) NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"sent_date" date,
	"response_status" "portal"."rfq_response" DEFAULT 'Invited' NOT NULL,
	CONSTRAINT "rfq_vendor_pkey" PRIMARY KEY("rfq_id","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."equipment_cover" (
	"sku" varchar(30) NOT NULL,
	"location_code" varchar(10) NOT NULL,
	"amc_expiry" date,
	"warranty_expiry" date,
	CONSTRAINT "equipment_cover_pkey" PRIMARY KEY("location_code","sku")
);
--> statement-breakpoint
CREATE TABLE "shared"."report_visibility" (
	"report_code" varchar(40) NOT NULL,
	"role_code" varchar(30) NOT NULL,
	"scope" "shared"."visibility_scope" NOT NULL,
	"status" "shared"."active_status" DEFAULT 'Active' NOT NULL,
	CONSTRAINT "report_visibility_pkey" PRIMARY KEY("report_code","role_code")
);
--> statement-breakpoint
CREATE TABLE "portal"."deployment_event" (
	"deployment_id" varchar(20) NOT NULL,
	"event_no" smallint NOT NULL,
	"actor_id" integer,
	"action" varchar(120) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deployment_event_pkey" PRIMARY KEY("deployment_id","event_no")
);
--> statement-breakpoint
CREATE TABLE "portal"."vendor_evaluation_criteria" (
	"criteria_set_id" varchar(20) NOT NULL,
	"criteria_id" varchar(20) NOT NULL,
	"criteria_name" varchar(60) NOT NULL,
	"weightage_pct" numeric(5, 2) NOT NULL,
	"scoring_method" "portal"."scoring_method" NOT NULL,
	"is_mandatory" boolean DEFAULT false NOT NULL,
	CONSTRAINT "vendor_evaluation_criteria_pkey" PRIMARY KEY("criteria_id","criteria_set_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_check_line" (
	"indent_id" varchar(20) NOT NULL,
	"sku" varchar(30) NOT NULL,
	"on_hand_at_check" numeric(14, 3) NOT NULL,
	"available_at_check" numeric(14, 3) NOT NULL,
	"issue_qty" numeric(14, 3) NOT NULL,
	"remark" varchar(160),
	CONSTRAINT "stock_check_line_pkey" PRIMARY KEY("indent_id","sku")
);
--> statement-breakpoint
CREATE TABLE "portal"."amc_renewal_decision" (
	"renewal_id" varchar(20) NOT NULL,
	"decision_no" smallint NOT NULL,
	"actor_id" integer,
	"role_code" varchar(30),
	"action" varchar(120) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amc_renewal_decision_pkey" PRIMARY KEY("decision_no","renewal_id")
);
--> statement-breakpoint
CREATE TABLE "hostel"."room_handover_line" (
	"handover_id" bigint NOT NULL,
	"line_no" smallint NOT NULL,
	"asset_id" varchar(40) NOT NULL,
	"condition" "hostel"."item_condition" NOT NULL,
	"damage_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"remarks" text,
	CONSTRAINT "room_handover_line_pkey" PRIMARY KEY("handover_id","line_no"),
	CONSTRAINT "room_handover_line_check" CHECK ((damage_amount = (0)::numeric) OR (condition = ANY (ARRAY['Damaged'::hostel.item_condition, 'Missing'::hostel.item_condition]))),
	CONSTRAINT "room_handover_line_damage_amount_check" CHECK (damage_amount >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "portal"."user_role" (
	"user_id" integer NOT NULL,
	"role_code" varchar(30) NOT NULL,
	"scope_dept" varchar(20) NOT NULL,
	"granted_on" date DEFAULT CURRENT_DATE NOT NULL,
	"approval_ref" varchar(80),
	"granted_by" varchar(20),
	CONSTRAINT "user_role_pkey" PRIMARY KEY("role_code","scope_dept","user_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."indent_event" (
	"indent_id" varchar(20) NOT NULL,
	"event_no" smallint NOT NULL,
	"actor_id" integer,
	"role_code" varchar(30),
	"action" varchar(120) NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indent_event_pkey" PRIMARY KEY("event_no","indent_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."new_request_event" (
	"request_id" varchar(20) NOT NULL,
	"event_no" smallint NOT NULL,
	"actor_id" integer,
	"role_code" varchar(30),
	"action" varchar(120) NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "new_request_event_pkey" PRIMARY KEY("event_no","request_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."po_event" (
	"po_id" integer NOT NULL,
	"event_no" smallint NOT NULL,
	"actor_id" integer,
	"role_code" varchar(30),
	"action" varchar(120) NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "po_event_pkey" PRIMARY KEY("event_no","po_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."material_issue_line" (
	"issue_id" varchar(20) NOT NULL,
	"sku" varchar(30) NOT NULL,
	"bin_code" varchar(20) NOT NULL,
	"batch_id" bigint,
	"serial_no" varchar(80),
	"qty" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(14, 2),
	"total_cost" numeric(16, 2) GENERATED ALWAYS AS ((qty * COALESCE(unit_cost, (0)::numeric))) STORED,
	"asset_id" varchar(40),
	CONSTRAINT "material_issue_line_pkey" PRIMARY KEY("bin_code","issue_id","sku")
);
--> statement-breakpoint
CREATE TABLE "hostel"."meter_monthly_usage" (
	"meter_id" bigint NOT NULL,
	"usage_month" date NOT NULL,
	"opening_reading" numeric(12, 2) NOT NULL,
	"closing_reading" numeric(12, 2) NOT NULL,
	"units_used" numeric(12, 2) GENERATED ALWAYS AS ((closing_reading - opening_reading)) STORED,
	"included_units" numeric(10, 2) NOT NULL,
	"recharged_units" numeric(10, 2) DEFAULT '0' NOT NULL,
	"excess_units" numeric(12, 2) GENERATED ALWAYS AS (GREATEST(((closing_reading - opening_reading) - included_units), (0)::numeric)) STORED,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meter_monthly_usage_pkey" PRIMARY KEY("meter_id","usage_month"),
	CONSTRAINT "meter_monthly_usage_check" CHECK (closing_reading >= opening_reading)
);
--> statement-breakpoint
CREATE TABLE "hostel"."movement_event_default" (
	"event_id" bigint GENERATED ALWAYS AS IDENTITY (sequence name "hostel"."null" INCREMENT BY null MINVALUE null MAXVALUE null START WITH null),
	"student_id" varchar(20) NOT NULL,
	"point_id" bigint NOT NULL,
	"direction" "hostel"."direction" NOT NULL,
	"event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" "hostel"."event_source" NOT NULL,
	"match_confidence" numeric(5, 2),
	"outpass_id" bigint,
	"recorded_by" varchar(20),
	CONSTRAINT "movement_event_default_pkey" PRIMARY KEY("event_at","event_id"),
	CONSTRAINT "movement_event_check" CHECK ((source <> 'Camera'::hostel.event_source) OR (match_confidence IS NOT NULL)),
	CONSTRAINT "movement_event_check1" CHECK ((source <> 'Manual'::hostel.event_source) OR (recorded_by IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "ref"."staff_address" (
	"staff_id" varchar(20) NOT NULL,
	"address_type" "ref"."address_type" NOT NULL,
	"door_no" varchar(60),
	"street" varchar(120),
	"landmark" varchar(120),
	"city" varchar(80),
	"district" varchar(80),
	"state" varchar(80),
	"country" varchar(60) DEFAULT 'India',
	"pincode" varchar(10),
	CONSTRAINT "staff_address_pkey" PRIMARY KEY("address_type","staff_id")
);
--> statement-breakpoint
CREATE TABLE "hostel"."sick_meal_delivery" (
	"sick_leave_id" bigint NOT NULL,
	"meal_date" date NOT NULL,
	"slot" "hostel"."meal_slot" NOT NULL,
	"delivered_by" varchar(20),
	"delivered_at" timestamp with time zone,
	"status" "hostel"."delivery_status" DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" varchar(20),
	"updated_at" timestamp with time zone,
	"updated_by" varchar(20),
	CONSTRAINT "sick_meal_delivery_pkey" PRIMARY KEY("meal_date","sick_leave_id","slot"),
	CONSTRAINT "sick_meal_delivery_check" CHECK ((status <> 'Delivered'::hostel.delivery_status) OR ((delivered_by IS NOT NULL) AND (delivered_at IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "ref"."student_address" (
	"student_id" varchar(20) NOT NULL,
	"address_type" "ref"."address_type" DEFAULT 'Permanent' NOT NULL,
	"seq_no" smallint DEFAULT 1 NOT NULL,
	"hno" varchar(80),
	"street" varchar(120),
	"landmark" varchar(160),
	"district" varchar(80),
	"state" varchar(80),
	"city" varchar(80),
	"country" varchar(60) DEFAULT 'India',
	"pincode" varchar(10),
	CONSTRAINT "student_address_pkey" PRIMARY KEY("address_type","seq_no","student_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."stock_sheet_line" (
	"sheet_id" integer NOT NULL,
	"line_no" integer NOT NULL,
	"sl_no" varchar(10),
	"material_name" varchar(160) NOT NULL,
	"make" varchar(80),
	"unit" varchar(20),
	"qty_text" varchar(40),
	"qty_value" numeric(14, 3),
	"qty_basis" "portal"."qty_basis" DEFAULT 'as_written' NOT NULL,
	"remarks" text,
	"sku" varchar(30),
	CONSTRAINT "stock_sheet_line_pkey" PRIMARY KEY("line_no","sheet_id")
);
--> statement-breakpoint
CREATE TABLE "shared"."audit_log_default" (
	"audit_id" bigint GENERATED ALWAYS AS IDENTITY (sequence name "shared"."null" INCREMENT BY null MINVALUE null MAXVALUE null START WITH null),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" varchar(40) NOT NULL,
	"outcome" varchar(60) NOT NULL,
	"actor" varchar(40),
	"role_code" varchar(30),
	"table_name" varchar(80),
	"row_key" varchar(80),
	"detail" jsonb,
	"prev_hash" char(64),
	"hash" char(64),
	CONSTRAINT "audit_log_default_pkey" PRIMARY KEY("audit_id","occurred_at")
);
--> statement-breakpoint
CREATE TABLE "portal"."stock" (
	"sku" varchar(30) NOT NULL,
	"bin_code" varchar(20) NOT NULL,
	"batch_id" bigint NOT NULL,
	"qty" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_reserved" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_available" numeric(14, 3) GENERATED ALWAYS AS ((qty - qty_reserved)) STORED,
	"qty_on_order" numeric(14, 3) DEFAULT '0' NOT NULL,
	"avg_unit_cost" numeric(14, 2),
	"stock_value" numeric(16, 2) GENERATED ALWAYS AS ((qty * COALESCE(avg_unit_cost, (0)::numeric))) STORED,
	"last_receipt_date" date,
	"last_issue_date" date,
	"counted_on" date,
	CONSTRAINT "stock_pkey" PRIMARY KEY("batch_id","bin_code","sku")
);
--> statement-breakpoint
CREATE TABLE "portal"."indent_line" (
	"indent_id" varchar(20) NOT NULL,
	"sku" varchar(30),
	"item_description" varchar(200),
	"specification" text,
	"uom" varchar(10),
	"qty" numeric(14, 3) NOT NULL,
	"qty_approved" numeric(14, 3),
	"unit_price_at_indent" numeric(14, 2),
	"qty_available_substore" numeric(14, 3),
	"qty_available_central" numeric(14, 3),
	"fulfilment_source" "portal"."fulfilment_source",
	"qty_issued" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_to_purchase" numeric(14, 3) DEFAULT '0' NOT NULL,
	"pr_line_id" bigint,
	"line_status" "portal"."indent_line_status" DEFAULT 'Pending' NOT NULL,
	"line_no" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "indent_line_pkey" PRIMARY KEY("indent_id","line_no")
);
--> statement-breakpoint
CREATE TABLE "portal"."rfq_bid" (
	"rfq_id" varchar(20) NOT NULL,
	"vendor_id" varchar(20) NOT NULL,
	"quotation_no" varchar(40),
	"quotation_date" date,
	"validity_date" date,
	"offered_brand_model" varchar(120),
	"spec_compliance" "portal"."spec_compliance",
	"quoted_qty" numeric(14, 3),
	"unit_price" numeric(14, 2) NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"lead_days" smallint,
	"warranty_months" smallint,
	"payment_terms" varchar(120),
	"freight_included" boolean DEFAULT false NOT NULL,
	"installation_included" boolean DEFAULT false NOT NULL,
	"attachment_doc_id" uuid,
	"status" "portal"."bid_status" DEFAULT 'Received' NOT NULL,
	CONSTRAINT "rfq_bid_pkey" PRIMARY KEY("rfq_id","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "portal"."po_line" (
	"po_id" integer NOT NULL,
	"line_no" smallint NOT NULL,
	"sku" varchar(30) NOT NULL,
	"description" varchar(200),
	"brand_model" varchar(120),
	"qty" numeric(14, 3) NOT NULL,
	"uom" varchar(10),
	"unit_price" numeric(14, 2) NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cgst_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"sgst_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"igst_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"qty_received" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_rejected" numeric(14, 3) DEFAULT '0' NOT NULL,
	"qty_pending" numeric(14, 3) GENERATED ALWAYS AS ((qty - qty_received)) STORED,
	"install_space_id" varchar(30),
	"line_status" "portal"."po_line_status" DEFAULT 'Open' NOT NULL,
	"po_line_id" bigint GENERATED ALWAYS AS IDENTITY (sequence name "portal"."portal.po_line_po_line_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	CONSTRAINT "po_line_pkey" PRIMARY KEY("line_no","po_id"),
	CONSTRAINT "po_line_po_line_id_key" UNIQUE("po_line_id")
);
--> statement-breakpoint
ALTER TABLE "ref"."department" ADD CONSTRAINT "fk_department_hod" FOREIGN KEY ("hod_staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."course" ADD CONSTRAINT "course_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."section" ADD CONSTRAINT "fk_section_advisor" FOREIGN KEY ("class_advisor_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."section" ADD CONSTRAINT "section_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "ref"."course"("course_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."batch" ADD CONSTRAINT "batch_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "ref"."section"("section_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."subject" ADD CONSTRAINT "subject_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "ref"."course"("course_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_qualification" ADD CONSTRAINT "staff_qualification_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_master" ADD CONSTRAINT "fk_staff_campus" FOREIGN KEY ("campus_code") REFERENCES "infra"."campus"("campus_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_master" ADD CONSTRAINT "fk_staff_import" FOREIGN KEY ("import_batch_id") REFERENCES "shared"."import_batch"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_master" ADD CONSTRAINT "staff_master_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_contact" ADD CONSTRAINT "staff_contact_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_dependent" ADD CONSTRAINT "staff_dependent_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_employment_history" ADD CONSTRAINT "staff_employment_history_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_membership" ADD CONSTRAINT "staff_membership_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."sport" ADD CONSTRAINT "fk_sport_space" FOREIGN KEY ("default_space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_responsibility" ADD CONSTRAINT "staff_responsibility_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."student_master" ADD CONSTRAINT "fk_student_import" FOREIGN KEY ("import_batch_id") REFERENCES "shared"."import_batch"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."student_master" ADD CONSTRAINT "student_master_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."student_master" ADD CONSTRAINT "student_master_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "ref"."course"("course_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."student_master" ADD CONSTRAINT "student_master_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."student_master" ADD CONSTRAINT "student_master_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "ref"."section"("section_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."facility" ADD CONSTRAINT "facility_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "infra"."campus"("campus_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."facility" ADD CONSTRAINT "facility_incharge_id_fkey" FOREIGN KEY ("incharge_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."zone" ADD CONSTRAINT "zone_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."space" ADD CONSTRAINT "space_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "infra"."zone"("zone_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."subspace" ADD CONSTRAINT "subspace_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."asset_master" ADD CONSTRAINT "asset_master_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."asset_master" ADD CONSTRAINT "fk_asset_sku" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."asset_master" ADD CONSTRAINT "fk_asset_vendor" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."class_allocation" ADD CONSTRAINT "class_allocation_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."class_allocation" ADD CONSTRAINT "class_allocation_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "ref"."section"("section_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."class_allocation" ADD CONSTRAINT "class_allocation_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "infra"."timetable_slot"("slot_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."class_allocation" ADD CONSTRAINT "class_allocation_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."class_allocation" ADD CONSTRAINT "class_allocation_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "ref"."subject"("subject_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."lab_allocation" ADD CONSTRAINT "lab_allocation_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ref"."batch"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."lab_allocation" ADD CONSTRAINT "lab_allocation_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."lab_allocation" ADD CONSTRAINT "lab_allocation_lab_assistant_id_fkey" FOREIGN KEY ("lab_assistant_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."lab_allocation" ADD CONSTRAINT "lab_allocation_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "infra"."timetable_slot"("slot_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."lab_allocation" ADD CONSTRAINT "lab_allocation_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."lab_allocation" ADD CONSTRAINT "lab_allocation_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "ref"."subject"("subject_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."lab_workstation_map" ADD CONSTRAINT "lab_workstation_map_lab_alloc_id_fkey" FOREIGN KEY ("lab_alloc_id") REFERENCES "infra"."lab_allocation"("lab_alloc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."lab_workstation_map" ADD CONSTRAINT "lab_workstation_map_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."lab_workstation_map" ADD CONSTRAINT "lab_workstation_map_subspace_id_fkey" FOREIGN KEY ("subspace_id") REFERENCES "infra"."subspace"("subspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."activity_booking" ADD CONSTRAINT "activity_booking_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."activity_booking" ADD CONSTRAINT "activity_booking_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."sports_membership" ADD CONSTRAINT "sports_membership_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."sports_membership" ADD CONSTRAINT "sports_membership_sport_id_fkey" FOREIGN KEY ("sport_id") REFERENCES "ref"."sport"("sport_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."sports_membership" ADD CONSTRAINT "sports_membership_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."space_availability_log" ADD CONSTRAINT "space_availability_log_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_category" ADD CONSTRAINT "fk_cat_team" FOREIGN KEY ("default_team_id") REFERENCES "infra"."maintenance_team"("team_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_team" ADD CONSTRAINT "maintenance_team_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "infra"."maintenance_category"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_team" ADD CONSTRAINT "maintenance_team_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."technician" ADD CONSTRAINT "technician_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."technician" ADD CONSTRAINT "technician_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "infra"."maintenance_team"("team_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "infra"."technician"("technician_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "infra"."maintenance_category"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_follow_up_of_fkey" FOREIGN KEY ("follow_up_of") REFERENCES "infra"."maintenance_ticket"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."maintenance_ticket" ADD CONSTRAINT "maintenance_ticket_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."inspection_log" ADD CONSTRAINT "inspection_log_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."inspection_log" ADD CONSTRAINT "inspection_log_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."inspection_log" ADD CONSTRAINT "inspection_log_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "infra"."maintenance_ticket"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."pm_schedule" ADD CONSTRAINT "pm_schedule_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."pm_schedule" ADD CONSTRAINT "pm_schedule_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "infra"."maintenance_team"("team_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."pm_schedule" ADD CONSTRAINT "pm_schedule_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "infra"."maintenance_category"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."pm_schedule" ADD CONSTRAINT "pm_schedule_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."work_order" ADD CONSTRAINT "fk_wo_vendor" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."work_order" ADD CONSTRAINT "work_order_pm_schedule_id_fkey" FOREIGN KEY ("pm_schedule_id") REFERENCES "infra"."pm_schedule"("pm_schedule_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."work_order" ADD CONSTRAINT "work_order_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "infra"."technician"("technician_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."work_order" ADD CONSTRAINT "work_order_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "infra"."maintenance_ticket"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."work_order_part" ADD CONSTRAINT "fk_wopart_sku" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."work_order_part" ADD CONSTRAINT "work_order_part_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "infra"."work_order"("work_order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."amc_contract" ADD CONSTRAINT "amc_contract_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."amc_contract" ADD CONSTRAINT "fk_amc_vendor" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infra"."utility_consumption" ADD CONSTRAINT "utility_consumption_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."app_user" ADD CONSTRAINT "app_user_home_dept_fkey" FOREIGN KEY ("home_dept") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."app_user" ADD CONSTRAINT "app_user_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."category" ADD CONSTRAINT "category_parent_category_code_fkey" FOREIGN KEY ("parent_category_code") REFERENCES "portal"."category"("category_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."category" ADD CONSTRAINT "fk_category_gl" FOREIGN KEY ("default_gl_account_id") REFERENCES "portal"."gl_account"("gl_account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."sub_category" ADD CONSTRAINT "sub_category_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "portal"."category"("category_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_group" ADD CONSTRAINT "stock_group_parent_group_code_fkey" FOREIGN KEY ("parent_group_code") REFERENCES "portal"."stock_group"("group_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."unit_of_measure" ADD CONSTRAINT "unit_of_measure_base_uom_fkey" FOREIGN KEY ("base_uom") REFERENCES "portal"."unit_of_measure"("uom") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."gl_account" ADD CONSTRAINT "gl_account_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "portal"."gl_account"("gl_account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."ledger" ADD CONSTRAINT "ledger_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "portal"."gl_account"("gl_account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_alt_unit_fkey" FOREIGN KEY ("alt_unit") REFERENCES "portal"."unit_of_measure"("uom") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_base_unit_fkey" FOREIGN KEY ("base_unit") REFERENCES "portal"."unit_of_measure"("uom") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "portal"."category"("category_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_custodian_dept_code_fkey" FOREIGN KEY ("custodian_dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_hsn_sac_code_fkey" FOREIGN KEY ("hsn_sac_code") REFERENCES "portal"."hsn_sac"("hsn_sac_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_preferred_supplier_code_fkey" FOREIGN KEY ("preferred_supplier_code") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_purchase_ledger_code_fkey" FOREIGN KEY ("purchase_ledger_code") REFERENCES "portal"."ledger"("ledger_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_sales_ledger_code_fkey" FOREIGN KEY ("sales_ledger_code") REFERENCES "portal"."ledger"("ledger_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_stock_group_code_fkey" FOREIGN KEY ("stock_group_code") REFERENCES "portal"."stock_group"("group_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_sub_category_id_fkey" FOREIGN KEY ("sub_category_id") REFERENCES "portal"."sub_category"("sub_category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material" ADD CONSTRAINT "material_substitute_sku_fkey" FOREIGN KEY ("substitute_sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."batch" ADD CONSTRAINT "batch_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."location" ADD CONSTRAINT "location_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "infra"."campus"("campus_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."location" ADD CONSTRAINT "location_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."location" ADD CONSTRAINT "location_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."location" ADD CONSTRAINT "location_parent_location_code_fkey" FOREIGN KEY ("parent_location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."location" ADD CONSTRAINT "location_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."location" ADD CONSTRAINT "location_store_keeper_id_fkey" FOREIGN KEY ("store_keeper_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."bin" ADD CONSTRAINT "bin_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."serialised_stock" ADD CONSTRAINT "fk_serial_grn" FOREIGN KEY ("grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."serialised_stock" ADD CONSTRAINT "serialised_stock_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."serialised_stock" ADD CONSTRAINT "serialised_stock_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."serialised_stock" ADD CONSTRAINT "serialised_stock_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_item" ADD CONSTRAINT "vendor_item_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_item" ADD CONSTRAINT "vendor_item_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."transporter" ADD CONSTRAINT "transporter_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."tax_master" ADD CONSTRAINT "tax_master_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "portal"."gl_account"("gl_account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."budget_head" ADD CONSTRAINT "budget_head_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."budget_head" ADD CONSTRAINT "budget_head_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "portal"."gl_account"("gl_account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."reorder_rule" ADD CONSTRAINT "reorder_rule_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."reorder_rule" ADD CONSTRAINT "reorder_rule_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."approval_authority_matrix" ADD CONSTRAINT "approval_authority_matrix_level_1_role_fkey" FOREIGN KEY ("level_1_role") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."approval_authority_matrix" ADD CONSTRAINT "approval_authority_matrix_level_2_role_fkey" FOREIGN KEY ("level_2_role") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."approval_authority_matrix" ADD CONSTRAINT "approval_authority_matrix_level_3_role_fkey" FOREIGN KEY ("level_3_role") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_adj" FOREIGN KEY ("adjustment_id") REFERENCES "portal"."stock_adjustment"("adjustment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_count" FOREIGN KEY ("count_id") REFERENCES "portal"."physical_count"("count_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_deployment" FOREIGN KEY ("deployment_id") REFERENCES "portal"."deployment"("deployment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_entry" FOREIGN KEY ("stock_entry_id") REFERENCES "portal"."stock_entry"("entry_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_grn" FOREIGN KEY ("grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_issue" FOREIGN KEY ("issue_id") REFERENCES "portal"."material_issue"("issue_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_receipt" FOREIGN KEY ("receipt_id") REFERENCES "portal"."receipt"("receipt_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_return" FOREIGN KEY ("return_id") REFERENCES "portal"."stock_return"("return_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_rtv" FOREIGN KEY ("rtv_id") REFERENCES "portal"."return_to_vendor"("rtv_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_srn" FOREIGN KEY ("srn_id") REFERENCES "portal"."scrap_return"("srn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "fk_mv_transfer" FOREIGN KEY ("transfer_id") REFERENCES "portal"."stock_transfer"("transfer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "stock_movement_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "stock_movement_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "portal"."batch"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "stock_movement_bin_code_fkey" FOREIGN KEY ("bin_code") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_movement" ADD CONSTRAINT "stock_movement_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_budget_code_fkey" FOREIGN KEY ("budget_code") REFERENCES "portal"."budget_head"("budget_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_hod_approval_by_fkey" FOREIGN KEY ("hod_approval_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_preferred_location_fkey" FOREIGN KEY ("preferred_location") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_target_space_id_fkey" FOREIGN KEY ("target_space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "infra"."maintenance_ticket"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "infra"."work_order"("work_order_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent" ADD CONSTRAINT "indent_workflow_step_fkey" FOREIGN KEY ("workflow_step") REFERENCES "portal"."indent_step"("step") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_transfer" ADD CONSTRAINT "stock_transfer_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_transfer" ADD CONSTRAINT "stock_transfer_from_location_fkey" FOREIGN KEY ("from_location") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_transfer" ADD CONSTRAINT "stock_transfer_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_transfer" ADD CONSTRAINT "stock_transfer_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_transfer" ADD CONSTRAINT "stock_transfer_to_location_fkey" FOREIGN KEY ("to_location") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_check" ADD CONSTRAINT "stock_check_checked_by_fkey" FOREIGN KEY ("checked_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_check" ADD CONSTRAINT "stock_check_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."scrap_return" ADD CONSTRAINT "scrap_return_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."scrap_return" ADD CONSTRAINT "scrap_return_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."scrap_return" ADD CONSTRAINT "scrap_return_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."scrap_return" ADD CONSTRAINT "scrap_return_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue" ADD CONSTRAINT "fk_issue_alloc" FOREIGN KEY ("hostel_alloc_id") REFERENCES "hostel"."hostel_allocation"("hostel_alloc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue" ADD CONSTRAINT "material_issue_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue" ADD CONSTRAINT "material_issue_collected_by_fkey" FOREIGN KEY ("collected_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue" ADD CONSTRAINT "material_issue_delivered_to_space_id_fkey" FOREIGN KEY ("delivered_to_space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue" ADD CONSTRAINT "material_issue_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue" ADD CONSTRAINT "material_issue_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue" ADD CONSTRAINT "material_issue_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue" ADD CONSTRAINT "material_issue_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue" ADD CONSTRAINT "material_issue_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "infra"."maintenance_ticket"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."dept_consumption" ADD CONSTRAINT "dept_consumption_custodian_id_fkey" FOREIGN KEY ("custodian_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."dept_consumption" ADD CONSTRAINT "dept_consumption_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."dept_consumption" ADD CONSTRAINT "dept_consumption_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "portal"."material_issue"("issue_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."dept_consumption" ADD CONSTRAINT "dept_consumption_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."dept_consumption" ADD CONSTRAINT "dept_consumption_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."receipt" ADD CONSTRAINT "receipt_bin_code_fkey" FOREIGN KEY ("bin_code") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."receipt" ADD CONSTRAINT "receipt_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."receipt" ADD CONSTRAINT "receipt_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."receipt" ADD CONSTRAINT "receipt_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_entry" ADD CONSTRAINT "fk_stock_entry_po" FOREIGN KEY ("matched_po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_entry" ADD CONSTRAINT "stock_entry_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_entry" ADD CONSTRAINT "stock_entry_bin_code_fkey" FOREIGN KEY ("bin_code") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_entry" ADD CONSTRAINT "stock_entry_matched_indent_id_fkey" FOREIGN KEY ("matched_indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_entry" ADD CONSTRAINT "stock_entry_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_return" ADD CONSTRAINT "stock_return_from_dept_fkey" FOREIGN KEY ("from_dept") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_return" ADD CONSTRAINT "stock_return_from_space_id_fkey" FOREIGN KEY ("from_space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_return" ADD CONSTRAINT "stock_return_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "portal"."material_issue"("issue_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_return" ADD CONSTRAINT "stock_return_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_return" ADD CONSTRAINT "stock_return_returned_by_fkey" FOREIGN KEY ("returned_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_return" ADD CONSTRAINT "stock_return_to_location_fkey" FOREIGN KEY ("to_location") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_transfer_line" ADD CONSTRAINT "stock_transfer_line_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "portal"."batch"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_transfer_line" ADD CONSTRAINT "stock_transfer_line_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_transfer_line" ADD CONSTRAINT "stock_transfer_line_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "portal"."stock_transfer"("transfer_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_adjustment" ADD CONSTRAINT "stock_adjustment_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_adjustment" ADD CONSTRAINT "stock_adjustment_bin_code_fkey" FOREIGN KEY ("bin_code") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_adjustment" ADD CONSTRAINT "stock_adjustment_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_adjustment" ADD CONSTRAINT "stock_adjustment_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_adjustment" ADD CONSTRAINT "stock_adjustment_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."physical_count" ADD CONSTRAINT "physical_count_counted_by_fkey" FOREIGN KEY ("counted_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."physical_count" ADD CONSTRAINT "physical_count_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."physical_count" ADD CONSTRAINT "physical_count_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."physical_count_line" ADD CONSTRAINT "physical_count_line_adjustment_id_fkey" FOREIGN KEY ("adjustment_id") REFERENCES "portal"."stock_adjustment"("adjustment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."physical_count_line" ADD CONSTRAINT "physical_count_line_bin_code_fkey" FOREIGN KEY ("bin_code") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."physical_count_line" ADD CONSTRAINT "physical_count_line_count_id_fkey" FOREIGN KEY ("count_id") REFERENCES "portal"."physical_count"("count_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."physical_count_line" ADD CONSTRAINT "physical_count_line_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."new_request" ADD CONSTRAINT "new_request_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "portal"."category"("category_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."new_request" ADD CONSTRAINT "new_request_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."new_request" ADD CONSTRAINT "new_request_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."new_request" ADD CONSTRAINT "new_request_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."new_request" ADD CONSTRAINT "new_request_registered_sku_fkey" FOREIGN KEY ("registered_sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."new_request" ADD CONSTRAINT "new_request_uom_fkey" FOREIGN KEY ("uom") REFERENCES "portal"."unit_of_measure"("uom") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."pr_line" ADD CONSTRAINT "fk_pr_line_po" FOREIGN KEY ("po_line_id") REFERENCES "portal"."po_line"("po_line_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."pr_line" ADD CONSTRAINT "pr_line_delivery_location_fkey" FOREIGN KEY ("delivery_location") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."pr_line" ADD CONSTRAINT "pr_line_indent_id_indent_line_no_fkey" FOREIGN KEY ("indent_id","indent_line_no") REFERENCES "portal"."indent_line"("indent_id","line_no") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."pr_line" ADD CONSTRAINT "pr_line_install_space_id_fkey" FOREIGN KEY ("install_space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."pr_line" ADD CONSTRAINT "pr_line_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "portal"."purchase_requisition"("pr_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."pr_line" ADD CONSTRAINT "pr_line_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."pr_line" ADD CONSTRAINT "pr_line_uom_fkey" FOREIGN KEY ("uom") REFERENCES "portal"."unit_of_measure"("uom") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_requisition" ADD CONSTRAINT "purchase_requisition_budget_code_fkey" FOREIGN KEY ("budget_code") REFERENCES "portal"."budget_head"("budget_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_requisition" ADD CONSTRAINT "purchase_requisition_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_requisition" ADD CONSTRAINT "purchase_requisition_finance_approval_fkey" FOREIGN KEY ("finance_approval") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_requisition" ADD CONSTRAINT "purchase_requisition_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_requisition" ADD CONSTRAINT "purchase_requisition_principal_approval_fkey" FOREIGN KEY ("principal_approval") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_requisition" ADD CONSTRAINT "purchase_requisition_raised_by_location_fkey" FOREIGN KEY ("raised_by_location") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_requisition" ADD CONSTRAINT "purchase_requisition_stores_head_approval_fkey" FOREIGN KEY ("stores_head_approval") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."rfq" ADD CONSTRAINT "rfq_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."rfq" ADD CONSTRAINT "rfq_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."rfq" ADD CONSTRAINT "rfq_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "portal"."purchase_requisition"("pr_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."rfq" ADD CONSTRAINT "rfq_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_evaluation" ADD CONSTRAINT "vendor_evaluation_criteria_set_id_criteria_id_fkey" FOREIGN KEY ("criteria_set_id","criteria_id") REFERENCES "portal"."vendor_evaluation_criteria"("criteria_set_id","criteria_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_evaluation" ADD CONSTRAINT "vendor_evaluation_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_evaluation" ADD CONSTRAINT "vendor_evaluation_rfq_id_vendor_id_fkey" FOREIGN KEY ("rfq_id","vendor_id") REFERENCES "portal"."rfq_bid"("rfq_id","vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_ranking" ADD CONSTRAINT "vendor_ranking_committee_approval_by_fkey" FOREIGN KEY ("committee_approval_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_ranking" ADD CONSTRAINT "vendor_ranking_rfq_id_vendor_id_fkey" FOREIGN KEY ("rfq_id","vendor_id") REFERENCES "portal"."rfq_bid"("rfq_id","vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_budget_code_fkey" FOREIGN KEY ("budget_code") REFERENCES "portal"."budget_head"("budget_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_delivery_location_fkey" FOREIGN KEY ("delivery_location") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_fy_fkey" FOREIGN KEY ("fy") REFERENCES "portal"."po_counter"("fy") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_pr_id_fkey" FOREIGN KEY ("pr_id") REFERENCES "portal"."purchase_requisition"("pr_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "portal"."new_request"("request_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "portal"."rfq"("rfq_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."purchase_order" ADD CONSTRAINT "purchase_order_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_terms" ADD CONSTRAINT "po_terms_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_amendment" ADD CONSTRAINT "po_amendment_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_amendment" ADD CONSTRAINT "po_amendment_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_condition" ADD CONSTRAINT "po_condition_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_condition" ADD CONSTRAINT "po_condition_watched_by_fkey" FOREIGN KEY ("watched_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_alert" ADD CONSTRAINT "po_alert_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_alert" ADD CONSTRAINT "po_alert_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "portal"."po_condition"("condition_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_alert" ADD CONSTRAINT "po_alert_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."approval_log" ADD CONSTRAINT "approval_log_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."approval_log" ADD CONSTRAINT "approval_log_approver_role_fkey" FOREIGN KEY ("approver_role") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."shipment" ADD CONSTRAINT "shipment_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."shipment" ADD CONSTRAINT "shipment_transporter_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "portal"."transporter"("transporter_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."shipment" ADD CONSTRAINT "shipment_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."shipment_tracking" ADD CONSTRAINT "shipment_tracking_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "portal"."shipment"("shipment_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."gate_entry" ADD CONSTRAINT "gate_entry_security_staff_id_fkey" FOREIGN KEY ("security_staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."gate_entry" ADD CONSTRAINT "gate_entry_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "portal"."shipment"("shipment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."grn" ADD CONSTRAINT "grn_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "portal"."batch"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."grn" ADD CONSTRAINT "grn_bin_code_fkey" FOREIGN KEY ("bin_code") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."grn" ADD CONSTRAINT "grn_gate_entry_id_fkey" FOREIGN KEY ("gate_entry_id") REFERENCES "portal"."gate_entry"("gate_entry_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."grn" ADD CONSTRAINT "grn_po_id_line_no_fkey" FOREIGN KEY ("po_id","line_no") REFERENCES "portal"."po_line"("po_id","line_no") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."grn" ADD CONSTRAINT "grn_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."grn" ADD CONSTRAINT "grn_receiving_location_fkey" FOREIGN KEY ("receiving_location") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."grn" ADD CONSTRAINT "grn_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "portal"."shipment"("shipment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."quality_inspection" ADD CONSTRAINT "fk_qi_doc" FOREIGN KEY ("report_doc_id") REFERENCES "shared"."document"("doc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."quality_inspection" ADD CONSTRAINT "quality_inspection_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."quality_inspection" ADD CONSTRAINT "quality_inspection_inspected_by_fkey" FOREIGN KEY ("inspected_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."quality_inspection_line" ADD CONSTRAINT "quality_inspection_line_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "portal"."quality_inspection"("inspection_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."return_to_vendor" ADD CONSTRAINT "fk_rtv_debit_note" FOREIGN KEY ("debit_note_id") REFERENCES "portal"."debit_note"("note_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."return_to_vendor" ADD CONSTRAINT "return_to_vendor_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."return_to_vendor" ADD CONSTRAINT "return_to_vendor_replacement_grn_id_fkey" FOREIGN KEY ("replacement_grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."return_to_vendor" ADD CONSTRAINT "return_to_vendor_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."return_to_vendor" ADD CONSTRAINT "return_to_vendor_transporter_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "portal"."transporter"("transporter_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."return_to_vendor" ADD CONSTRAINT "return_to_vendor_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_custodian_staff_id_fkey" FOREIGN KEY ("custodian_staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_from_bin_fkey" FOREIGN KEY ("from_bin") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_subspace_id_fkey" FOREIGN KEY ("subspace_id") REFERENCES "infra"."subspace"("subspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "infra"."technician"("technician_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "infra"."maintenance_ticket"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment" ADD CONSTRAINT "deployment_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."commissioning_handover" ADD CONSTRAINT "commissioning_handover_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "infra"."amc_contract"("amc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."commissioning_handover" ADD CONSTRAINT "commissioning_handover_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "portal"."deployment"("deployment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."commissioning_handover" ADD CONSTRAINT "commissioning_handover_handed_over_to_fkey" FOREIGN KEY ("handed_over_to") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."commissioning_handover" ADD CONSTRAINT "commissioning_handover_tested_by_fkey" FOREIGN KEY ("tested_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."commissioning_handover" ADD CONSTRAINT "fk_comm_doc" FOREIGN KEY ("test_report_doc_id") REFERENCES "shared"."document"("doc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset" ADD CONSTRAINT "asset_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset" ADD CONSTRAINT "asset_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "portal"."deployment"("deployment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset" ADD CONSTRAINT "asset_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset" ADD CONSTRAINT "asset_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset" ADD CONSTRAINT "asset_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "portal"."receipt"("receipt_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset" ADD CONSTRAINT "asset_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset" ADD CONSTRAINT "asset_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_capitalisation" ADD CONSTRAINT "asset_capitalisation_asset_gl_account_id_fkey" FOREIGN KEY ("asset_gl_account_id") REFERENCES "portal"."gl_account"("gl_account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_capitalisation" ADD CONSTRAINT "asset_capitalisation_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_capitalisation" ADD CONSTRAINT "asset_capitalisation_asset_tag_fkey" FOREIGN KEY ("asset_tag") REFERENCES "portal"."asset"("asset_tag") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_capitalisation" ADD CONSTRAINT "asset_capitalisation_custodian_id_fkey" FOREIGN KEY ("custodian_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_capitalisation" ADD CONSTRAINT "asset_capitalisation_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "portal"."deployment"("deployment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_capitalisation" ADD CONSTRAINT "asset_capitalisation_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_capitalisation" ADD CONSTRAINT "asset_capitalisation_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_capitalisation" ADD CONSTRAINT "asset_capitalisation_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_capitalisation" ADD CONSTRAINT "asset_capitalisation_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_transfer" ADD CONSTRAINT "asset_transfer_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_transfer" ADD CONSTRAINT "asset_transfer_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_transfer" ADD CONSTRAINT "asset_transfer_from_dept_fkey" FOREIGN KEY ("from_dept") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_transfer" ADD CONSTRAINT "asset_transfer_from_space_id_fkey" FOREIGN KEY ("from_space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_transfer" ADD CONSTRAINT "asset_transfer_to_dept_fkey" FOREIGN KEY ("to_dept") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."asset_transfer" ADD CONSTRAINT "asset_transfer_to_space_id_fkey" FOREIGN KEY ("to_space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."amc_renewal" ADD CONSTRAINT "amc_renewal_amc_id_fkey" FOREIGN KEY ("amc_id") REFERENCES "infra"."amc_contract"("amc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."amc_renewal" ADD CONSTRAINT "amc_renewal_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."amc_renewal" ADD CONSTRAINT "amc_renewal_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."amc_renewal" ADD CONSTRAINT "amc_renewal_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."service_ticket" ADD CONSTRAINT "service_ticket_asset_tag_fkey" FOREIGN KEY ("asset_tag") REFERENCES "portal"."asset"("asset_tag") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."service_ticket" ADD CONSTRAINT "service_ticket_maintenance_ticket_id_fkey" FOREIGN KEY ("maintenance_ticket_id") REFERENCES "infra"."maintenance_ticket"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."service_ticket" ADD CONSTRAINT "service_ticket_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."budget_txn" ADD CONSTRAINT "budget_txn_budget_code_fkey" FOREIGN KEY ("budget_code") REFERENCES "portal"."budget_head"("budget_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."budget_txn" ADD CONSTRAINT "budget_txn_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice" ADD CONSTRAINT "fk_invoice_doc" FOREIGN KEY ("doc_id") REFERENCES "shared"."document"("doc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice" ADD CONSTRAINT "vendor_invoice_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice" ADD CONSTRAINT "vendor_invoice_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice" ADD CONSTRAINT "vendor_invoice_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice" ADD CONSTRAINT "vendor_invoice_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice" ADD CONSTRAINT "vendor_invoice_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice_line" ADD CONSTRAINT "vendor_invoice_line_budget_code_fkey" FOREIGN KEY ("budget_code") REFERENCES "portal"."budget_head"("budget_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice_line" ADD CONSTRAINT "vendor_invoice_line_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "portal"."gl_account"("gl_account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice_line" ADD CONSTRAINT "vendor_invoice_line_grn_id_fkey" FOREIGN KEY ("grn_id") REFERENCES "portal"."grn"("grn_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice_line" ADD CONSTRAINT "vendor_invoice_line_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "portal"."vendor_invoice"("invoice_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice_line" ADD CONSTRAINT "vendor_invoice_line_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "portal"."po_line"("po_line_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_invoice_line" ADD CONSTRAINT "vendor_invoice_line_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_payment" ADD CONSTRAINT "po_payment_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_payment" ADD CONSTRAINT "po_payment_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_payment" ADD CONSTRAINT "po_payment_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_payment" ADD CONSTRAINT "po_payment_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."advance_payment" ADD CONSTRAINT "advance_payment_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "portal"."po_payment"("payment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."advance_payment" ADD CONSTRAINT "advance_payment_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."advance_payment" ADD CONSTRAINT "advance_payment_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."payment_allocation" ADD CONSTRAINT "payment_allocation_advance_id_fkey" FOREIGN KEY ("advance_id") REFERENCES "portal"."advance_payment"("advance_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."payment_allocation" ADD CONSTRAINT "payment_allocation_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "portal"."vendor_invoice"("invoice_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."payment_allocation" ADD CONSTRAINT "payment_allocation_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "portal"."po_payment"("payment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."debit_note" ADD CONSTRAINT "debit_note_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "portal"."vendor_invoice"("invoice_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."debit_note" ADD CONSTRAINT "debit_note_rtv_id_fkey" FOREIGN KEY ("rtv_id") REFERENCES "portal"."return_to_vendor"("rtv_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."debit_note" ADD CONSTRAINT "debit_note_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."journal_entry" ADD CONSTRAINT "journal_entry_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."journal_line" ADD CONSTRAINT "journal_line_budget_code_fkey" FOREIGN KEY ("budget_code") REFERENCES "portal"."budget_head"("budget_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."journal_line" ADD CONSTRAINT "journal_line_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."journal_line" ADD CONSTRAINT "journal_line_gl_account_id_fkey" FOREIGN KEY ("gl_account_id") REFERENCES "portal"."gl_account"("gl_account_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."journal_line" ADD CONSTRAINT "journal_line_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "portal"."journal_entry"("journal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_performance" ADD CONSTRAINT "vendor_performance_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_performance" ADD CONSTRAINT "vendor_performance_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_performance" ADD CONSTRAINT "vendor_performance_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."approval_step" ADD CONSTRAINT "approval_step_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."approval_step" ADD CONSTRAINT "approval_step_approver_role_fkey" FOREIGN KEY ("approver_role") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."approval_step" ADD CONSTRAINT "approval_step_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "shared"."approval_rule"("rule_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."approval_step" ADD CONSTRAINT "fk_step_contact" FOREIGN KEY ("acted_by_contact") REFERENCES "hostel"."student_contact"("contact_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."policy_setting" ADD CONSTRAINT "policy_setting_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."document" ADD CONSTRAINT "document_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."document" ADD CONSTRAINT "document_uploaded_by_student_fkey" FOREIGN KEY ("uploaded_by_student") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."import_batch" ADD CONSTRAINT "import_batch_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."approval_rule" ADD CONSTRAINT "approval_rule_approver_role_fkey" FOREIGN KEY ("approver_role") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."notification" ADD CONSTRAINT "fk_notif_contact" FOREIGN KEY ("contact_id") REFERENCES "hostel"."student_contact"("contact_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."notification" ADD CONSTRAINT "notification_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."notification" ADD CONSTRAINT "notification_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."mess_master" ADD CONSTRAINT "mess_master_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."mess_master" ADD CONSTRAINT "mess_master_incharge_id_fkey" FOREIGN KEY ("incharge_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."mess_master" ADD CONSTRAINT "mess_master_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_profile" ADD CONSTRAINT "hostel_profile_default_mess_id_fkey" FOREIGN KEY ("default_mess_id") REFERENCES "hostel"."mess_master"("mess_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_profile" ADD CONSTRAINT "hostel_profile_dept_code_fkey" FOREIGN KEY ("dept_code") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_profile" ADD CONSTRAINT "hostel_profile_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_profile" ADD CONSTRAINT "hostel_profile_sub_store_code_fkey" FOREIGN KEY ("sub_store_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."student_contact" ADD CONSTRAINT "student_contact_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_type_fee" ADD CONSTRAINT "room_type_fee_academic_year_fkey" FOREIGN KEY ("academic_year") REFERENCES "hostel"."academic_year"("academic_year") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_type_fee" ADD CONSTRAINT "room_type_fee_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "hostel"."hostel_profile"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_type_fee" ADD CONSTRAINT "room_type_fee_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hostel"."room_type"("room_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_profile" ADD CONSTRAINT "fk_room_nearest_point" FOREIGN KEY ("nearest_point_id") REFERENCES "hostel"."capture_point"("point_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_profile" ADD CONSTRAINT "room_profile_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hostel"."room_type"("room_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_profile" ADD CONSTRAINT "room_profile_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."mess_subscription" ADD CONSTRAINT "fk_mess_sub_demand" FOREIGN KEY ("mess_demand_id") REFERENCES "hostel"."fee_demand"("demand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."mess_subscription" ADD CONSTRAINT "mess_subscription_academic_year_fkey" FOREIGN KEY ("academic_year") REFERENCES "hostel"."academic_year"("academic_year") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."mess_subscription" ADD CONSTRAINT "mess_subscription_mess_id_fkey" FOREIGN KEY ("mess_id") REFERENCES "hostel"."mess_master"("mess_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."mess_subscription" ADD CONSTRAINT "mess_subscription_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."discipline_case" ADD CONSTRAINT "discipline_case_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."discipline_case" ADD CONSTRAINT "discipline_case_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."discipline_punishment" ADD CONSTRAINT "discipline_punishment_awarded_by_fkey" FOREIGN KEY ("awarded_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."discipline_punishment" ADD CONSTRAINT "discipline_punishment_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "hostel"."discipline_case"("case_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."discipline_punishment" ADD CONSTRAINT "discipline_punishment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."vacate_request" ADD CONSTRAINT "fk_vacate_alloc" FOREIGN KEY ("hostel_alloc_id") REFERENCES "hostel"."hostel_allocation"("hostel_alloc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."vacate_request" ADD CONSTRAINT "vacate_request_proof_doc_id_fkey" FOREIGN KEY ("proof_doc_id") REFERENCES "shared"."document"("doc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."vacate_request" ADD CONSTRAINT "vacate_request_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."no_dues_clearance" ADD CONSTRAINT "fk_clearance_demand" FOREIGN KEY ("demand_id") REFERENCES "hostel"."fee_demand"("demand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."no_dues_clearance" ADD CONSTRAINT "no_dues_clearance_cleared_by_fkey" FOREIGN KEY ("cleared_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."no_dues_clearance" ADD CONSTRAINT "no_dues_clearance_vacate_id_fkey" FOREIGN KEY ("vacate_id") REFERENCES "hostel"."vacate_request"("vacate_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_registration" ADD CONSTRAINT "fk_registration_reg_demand" FOREIGN KEY ("reg_demand_id") REFERENCES "hostel"."fee_demand"("demand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_registration" ADD CONSTRAINT "hostel_registration_academic_year_fkey" FOREIGN KEY ("academic_year") REFERENCES "hostel"."academic_year"("academic_year") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_registration" ADD CONSTRAINT "hostel_registration_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "hostel"."hostel_profile"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_registration" ADD CONSTRAINT "hostel_registration_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hostel"."room_type"("room_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_registration" ADD CONSTRAINT "hostel_registration_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_allocation" ADD CONSTRAINT "hostel_allocation_academic_year_fkey" FOREIGN KEY ("academic_year") REFERENCES "hostel"."academic_year"("academic_year") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_allocation" ADD CONSTRAINT "hostel_allocation_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_allocation" ADD CONSTRAINT "hostel_allocation_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_allocation" ADD CONSTRAINT "hostel_allocation_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "hostel"."room_offer"("offer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_allocation" ADD CONSTRAINT "hostel_allocation_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_allocation" ADD CONSTRAINT "hostel_allocation_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_allocation" ADD CONSTRAINT "hostel_allocation_subspace_id_fkey" FOREIGN KEY ("subspace_id") REFERENCES "infra"."subspace"("subspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_offer" ADD CONSTRAINT "room_offer_offered_by_fkey" FOREIGN KEY ("offered_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_offer" ADD CONSTRAINT "room_offer_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "hostel"."hostel_registration"("registration_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_offer" ADD CONSTRAINT "room_offer_subspace_id_fkey" FOREIGN KEY ("subspace_id") REFERENCES "infra"."subspace"("subspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_handover" ADD CONSTRAINT "room_handover_done_by_fkey" FOREIGN KEY ("done_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_handover" ADD CONSTRAINT "room_handover_hostel_alloc_id_fkey" FOREIGN KEY ("hostel_alloc_id") REFERENCES "hostel"."hostel_allocation"("hostel_alloc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_handover" ADD CONSTRAINT "room_handover_vacate_id_fkey" FOREIGN KEY ("vacate_id") REFERENCES "hostel"."vacate_request"("vacate_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."fee_plan" ADD CONSTRAINT "fee_plan_fee_id_fkey" FOREIGN KEY ("fee_id") REFERENCES "hostel"."room_type_fee"("fee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."fee_plan" ADD CONSTRAINT "fee_plan_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "hostel"."hostel_registration"("registration_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."fee_demand" ADD CONSTRAINT "fee_demand_fee_plan_id_fkey" FOREIGN KEY ("fee_plan_id") REFERENCES "hostel"."fee_plan"("fee_plan_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."fee_demand" ADD CONSTRAINT "fee_demand_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."staff_space_assignment" ADD CONSTRAINT "staff_space_assignment_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "hostel"."hostel_profile"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."staff_space_assignment" ADD CONSTRAINT "staff_space_assignment_hostel_role_fkey" FOREIGN KEY ("hostel_role") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."staff_space_assignment" ADD CONSTRAINT "staff_space_assignment_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."staff_space_assignment" ADD CONSTRAINT "staff_space_assignment_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."staff_space_assignment" ADD CONSTRAINT "staff_space_assignment_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "infra"."zone"("zone_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."space_qr" ADD CONSTRAINT "space_qr_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_meter" ADD CONSTRAINT "room_meter_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_meter" ADD CONSTRAINT "room_meter_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."electricity_tariff" ADD CONSTRAINT "electricity_tariff_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."electricity_tariff" ADD CONSTRAINT "electricity_tariff_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hostel"."room_type"("room_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."meter_student_map" ADD CONSTRAINT "meter_student_map_hostel_alloc_id_fkey" FOREIGN KEY ("hostel_alloc_id") REFERENCES "hostel"."hostel_allocation"("hostel_alloc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."meter_student_map" ADD CONSTRAINT "meter_student_map_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "hostel"."room_meter"("meter_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."fee_receipt" ADD CONSTRAINT "fee_receipt_collected_by_fkey" FOREIGN KEY ("collected_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."fee_receipt" ADD CONSTRAINT "fee_receipt_demand_id_fkey" FOREIGN KEY ("demand_id") REFERENCES "hostel"."fee_demand"("demand_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."meter_reading" ADD CONSTRAINT "meter_reading_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "hostel"."room_handover"("handover_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."meter_reading" ADD CONSTRAINT "meter_reading_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "hostel"."room_meter"("meter_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."meter_reading" ADD CONSTRAINT "meter_reading_read_by_fkey" FOREIGN KEY ("read_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."meter_recharge" ADD CONSTRAINT "meter_recharge_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "hostel"."room_meter"("meter_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."meter_recharge" ADD CONSTRAINT "meter_recharge_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "hostel"."fee_receipt"("receipt_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."meter_recharge" ADD CONSTRAINT "meter_recharge_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."tracking_consent" ADD CONSTRAINT "tracking_consent_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "hostel"."student_contact"("contact_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."tracking_consent" ADD CONSTRAINT "tracking_consent_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."tracking_consent" ADD CONSTRAINT "tracking_consent_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."capture_point" ADD CONSTRAINT "capture_point_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "infra"."facility"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."capture_point" ADD CONSTRAINT "capture_point_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."capture_point" ADD CONSTRAINT "capture_point_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "infra"."zone"("zone_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."student_current_status" ADD CONSTRAINT "student_current_status_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_alert" ADD CONSTRAINT "hostel_alert_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_alert" ADD CONSTRAINT "hostel_alert_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "hostel"."hostel_profile"("facility_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."hostel_alert" ADD CONSTRAINT "hostel_alert_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."location_access_log" ADD CONSTRAINT "location_access_log_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "hostel"."hostel_alert"("alert_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."location_access_log" ADD CONSTRAINT "location_access_log_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."location_access_log" ADD CONSTRAINT "location_access_log_viewer_staff_id_fkey" FOREIGN KEY ("viewer_staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."sick_leave" ADD CONSTRAINT "sick_leave_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."sick_leave" ADD CONSTRAINT "sick_leave_extended_from_id_fkey" FOREIGN KEY ("extended_from_id") REFERENCES "hostel"."sick_leave"("sick_leave_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."sick_leave" ADD CONSTRAINT "sick_leave_medical_doc_id_fkey" FOREIGN KEY ("medical_doc_id") REFERENCES "shared"."document"("doc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."sick_leave" ADD CONSTRAINT "sick_leave_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."sick_leave" ADD CONSTRAINT "sick_leave_visited_by_fkey" FOREIGN KEY ("visited_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."outpass" ADD CONSTRAINT "outpass_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_category" ADD CONSTRAINT "vendor_category_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "portal"."category"("category_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_category" ADD CONSTRAINT "vendor_category_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."vendor_tag" ADD CONSTRAINT "vendor_tag_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_alias" ADD CONSTRAINT "material_alias_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."bom_component" ADD CONSTRAINT "bom_component_component_sku_fkey" FOREIGN KEY ("component_sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."bom_component" ADD CONSTRAINT "bom_component_parent_sku_fkey" FOREIGN KEY ("parent_sku") REFERENCES "portal"."material"("sku") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_entry_finding" ADD CONSTRAINT "stock_entry_finding_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "portal"."stock_entry"("entry_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_standard_inventory" ADD CONSTRAINT "room_standard_inventory_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hostel"."room_type"("room_type_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_standard_inventory" ADD CONSTRAINT "room_standard_inventory_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_standard_rate" ADD CONSTRAINT "material_standard_rate_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."opening_stock" ADD CONSTRAINT "opening_stock_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "portal"."batch"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."opening_stock" ADD CONSTRAINT "opening_stock_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_reservation" ADD CONSTRAINT "stock_reservation_bin_code_fkey" FOREIGN KEY ("bin_code") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_reservation" ADD CONSTRAINT "stock_reservation_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_reservation" ADD CONSTRAINT "stock_reservation_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."rfq_vendor" ADD CONSTRAINT "rfq_vendor_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "portal"."rfq"("rfq_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."rfq_vendor" ADD CONSTRAINT "rfq_vendor_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."equipment_cover" ADD CONSTRAINT "equipment_cover_location_code_fkey" FOREIGN KEY ("location_code") REFERENCES "portal"."location"("location_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."equipment_cover" ADD CONSTRAINT "equipment_cover_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared"."report_visibility" ADD CONSTRAINT "report_visibility_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment_event" ADD CONSTRAINT "deployment_event_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."deployment_event" ADD CONSTRAINT "deployment_event_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "portal"."deployment"("deployment_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_check_line" ADD CONSTRAINT "stock_check_line_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."stock_check"("indent_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_check_line" ADD CONSTRAINT "stock_check_line_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."amc_renewal_decision" ADD CONSTRAINT "amc_renewal_decision_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."amc_renewal_decision" ADD CONSTRAINT "amc_renewal_decision_renewal_id_fkey" FOREIGN KEY ("renewal_id") REFERENCES "portal"."amc_renewal"("renewal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."amc_renewal_decision" ADD CONSTRAINT "amc_renewal_decision_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_handover_line" ADD CONSTRAINT "room_handover_line_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."room_handover_line" ADD CONSTRAINT "room_handover_line_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "hostel"."room_handover"("handover_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."user_role" ADD CONSTRAINT "user_role_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."user_role" ADD CONSTRAINT "user_role_scope_dept_fkey" FOREIGN KEY ("scope_dept") REFERENCES "ref"."department"("dept_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent_event" ADD CONSTRAINT "indent_event_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent_event" ADD CONSTRAINT "indent_event_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent_event" ADD CONSTRAINT "indent_event_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."new_request_event" ADD CONSTRAINT "new_request_event_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."new_request_event" ADD CONSTRAINT "new_request_event_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "portal"."new_request"("request_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."new_request_event" ADD CONSTRAINT "new_request_event_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_event" ADD CONSTRAINT "po_event_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "portal"."app_user"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_event" ADD CONSTRAINT "po_event_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_event" ADD CONSTRAINT "po_event_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "portal"."role"("role_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue_line" ADD CONSTRAINT "material_issue_line_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "infra"."asset_master"("asset_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue_line" ADD CONSTRAINT "material_issue_line_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "portal"."batch"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue_line" ADD CONSTRAINT "material_issue_line_bin_code_fkey" FOREIGN KEY ("bin_code") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue_line" ADD CONSTRAINT "material_issue_line_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "portal"."material_issue"("issue_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."material_issue_line" ADD CONSTRAINT "material_issue_line_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."meter_monthly_usage" ADD CONSTRAINT "meter_monthly_usage_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "hostel"."room_meter"("meter_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."movement_event_default" ADD CONSTRAINT "fk_movement_outpass" FOREIGN KEY ("outpass_id") REFERENCES "hostel"."outpass"("outpass_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."movement_event_default" ADD CONSTRAINT "movement_event_point_id_fkey" FOREIGN KEY ("point_id") REFERENCES "hostel"."capture_point"("point_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."movement_event_default" ADD CONSTRAINT "movement_event_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."movement_event_default" ADD CONSTRAINT "movement_event_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."staff_address" ADD CONSTRAINT "staff_address_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "ref"."staff_master"("staff_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."sick_meal_delivery" ADD CONSTRAINT "sick_meal_delivery_delivered_by_fkey" FOREIGN KEY ("delivered_by") REFERENCES "ref"."staff_master"("staff_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel"."sick_meal_delivery" ADD CONSTRAINT "sick_meal_delivery_sick_leave_id_fkey" FOREIGN KEY ("sick_leave_id") REFERENCES "hostel"."sick_leave"("sick_leave_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ref"."student_address" ADD CONSTRAINT "student_address_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "ref"."student_master"("student_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_sheet_line" ADD CONSTRAINT "stock_sheet_line_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "portal"."stock_sheet"("sheet_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock_sheet_line" ADD CONSTRAINT "stock_sheet_line_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock" ADD CONSTRAINT "stock_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "portal"."batch"("batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock" ADD CONSTRAINT "stock_bin_code_fkey" FOREIGN KEY ("bin_code") REFERENCES "portal"."bin"("bin_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."stock" ADD CONSTRAINT "stock_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent_line" ADD CONSTRAINT "fk_indent_line_pr" FOREIGN KEY ("pr_line_id") REFERENCES "portal"."pr_line"("pr_line_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent_line" ADD CONSTRAINT "indent_line_indent_id_fkey" FOREIGN KEY ("indent_id") REFERENCES "portal"."indent"("indent_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent_line" ADD CONSTRAINT "indent_line_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."indent_line" ADD CONSTRAINT "indent_line_uom_fkey" FOREIGN KEY ("uom") REFERENCES "portal"."unit_of_measure"("uom") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."rfq_bid" ADD CONSTRAINT "fk_bid_doc" FOREIGN KEY ("attachment_doc_id") REFERENCES "shared"."document"("doc_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."rfq_bid" ADD CONSTRAINT "rfq_bid_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "portal"."rfq"("rfq_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."rfq_bid" ADD CONSTRAINT "rfq_bid_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "portal"."vendor"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_line" ADD CONSTRAINT "po_line_install_space_id_fkey" FOREIGN KEY ("install_space_id") REFERENCES "infra"."space"("space_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_line" ADD CONSTRAINT "po_line_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "portal"."purchase_order"("po_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_line" ADD CONSTRAINT "po_line_sku_fkey" FOREIGN KEY ("sku") REFERENCES "portal"."material"("sku") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal"."po_line" ADD CONSTRAINT "po_line_uom_fkey" FOREIGN KEY ("uom") REFERENCES "portal"."unit_of_measure"("uom") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_student_master_dept" ON "ref"."student_master" USING btree ("dept_code" text_ops);--> statement-breakpoint
CREATE INDEX "ix_student_master_gender" ON "ref"."student_master" USING btree ("gender" enum_ops) WHERE (status = 'Active'::ref.student_status);--> statement-breakpoint
CREATE INDEX "ix_subspace_space_status" ON "infra"."subspace" USING btree ("space_id" text_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "ix_asset_space" ON "infra"."asset_master" USING btree ("space_id" text_ops);--> statement-breakpoint
CREATE INDEX "ix_ticket_facility_status" ON "infra"."maintenance_ticket" USING btree ("facility_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "ix_stock_movement_sku_bin" ON "portal"."stock_movement" USING btree ("sku" timestamptz_ops,"bin_code" text_ops,"moved_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "ix_approval_log_doc" ON "portal"."approval_log" USING btree ("document_type" text_ops,"document_id" text_ops);--> statement-breakpoint
CREATE INDEX "ix_budget_txn_head" ON "portal"."budget_txn" USING btree ("budget_code" date_ops,"txn_date" date_ops);--> statement-breakpoint
CREATE INDEX "ix_approval_step_pending" ON "shared"."approval_step" USING btree ("approver_role" text_ops,"decision" text_ops) WHERE (decision = 'Pending'::shared.decision);--> statement-breakpoint
CREATE INDEX "ix_document_attached" ON "shared"."document" USING btree ("attached_to" text_ops,"attached_id" text_ops);--> statement-breakpoint
CREATE INDEX "ix_notification_queue" ON "shared"."notification" USING btree ("delivery_status" timestamptz_ops,"queued_at" timestamptz_ops) WHERE (delivery_status = 'Queued'::shared.delivery_status);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_student_contact_outpass_approver" ON "hostel"."student_contact" USING btree ("student_id" text_ops) WHERE (is_outpass_approver AND (status = 'Active'::shared.active_status));--> statement-breakpoint
CREATE UNIQUE INDEX "ux_academic_year_current" ON "hostel"."academic_year" USING btree ("is_current" bool_ops) WHERE is_current;--> statement-breakpoint
CREATE UNIQUE INDEX "ux_mess_subscription_active" ON "hostel"."mess_subscription" USING btree ("student_id" text_ops) WHERE (status = 'Active'::hostel.subscription_status);--> statement-breakpoint
CREATE INDEX "ix_punishment_student_force" ON "hostel"."discipline_punishment" USING btree ("student_id" text_ops) WHERE ((status = 'In_Force'::hostel.punishment_status) AND bars_outings);--> statement-breakpoint
CREATE INDEX "ix_registration_facility_status" ON "hostel"."hostel_registration" USING btree ("facility_id" text_ops,"academic_year" text_ops,"status" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_allocation_active_bed" ON "hostel"."hostel_allocation" USING btree ("subspace_id" text_ops) WHERE (status = 'Active'::hostel.allocation_status);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_allocation_active_student" ON "hostel"."hostel_allocation" USING btree ("student_id" text_ops) WHERE ((status = 'Active'::hostel.allocation_status) AND (student_id IS NOT NULL));--> statement-breakpoint
CREATE UNIQUE INDEX "ux_allocation_offer" ON "hostel"."hostel_allocation" USING btree ("offer_id" int8_ops) WHERE (offer_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_room_offer_pending_bed" ON "hostel"."room_offer" USING btree ("subspace_id" text_ops) WHERE (student_decision = 'Pending'::hostel.student_decision);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_room_offer_pending_reg" ON "hostel"."room_offer" USING btree ("registration_id" int8_ops) WHERE (student_decision = 'Pending'::hostel.student_decision);--> statement-breakpoint
CREATE INDEX "ix_fee_demand_student_status" ON "hostel"."fee_demand" USING btree ("student_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_fee_demand_plan_head_inst" ON "hostel"."fee_demand" USING btree ("fee_plan_id" int2_ops,"fee_head" int2_ops,"instalment_no" int2_ops) WHERE (fee_plan_id IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_fee_demand_reference" ON "hostel"."fee_demand" USING btree ("reference_type" int8_ops,"reference_id" int8_ops) WHERE ((reference_type)::text = ANY ((ARRAY['room_handover'::character varying, 'meter_recharge'::character varying, 'discipline_punishment'::character varying])::text[]));--> statement-breakpoint
CREATE INDEX "ix_assignment_lookup" ON "hostel"."staff_space_assignment" USING btree ("facility_id" text_ops,"zone_id" text_ops,"hostel_role" text_ops) WHERE (status = 'Active'::hostel.assignment_status);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_space_qr_active" ON "hostel"."space_qr" USING btree ("space_id" text_ops) WHERE (status = 'Active'::hostel.qr_status);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_room_meter_active" ON "hostel"."room_meter" USING btree ("space_id" text_ops) WHERE (status = 'Active'::hostel.meter_status);--> statement-breakpoint
CREATE INDEX "ix_meter_map_open" ON "hostel"."meter_student_map" USING btree ("meter_id" int8_ops) WHERE (to_datetime IS NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_fee_receipt_gateway_ref" ON "hostel"."fee_receipt" USING btree ("gateway_ref" text_ops) WHERE (gateway_ref IS NOT NULL);--> statement-breakpoint
CREATE INDEX "ix_meter_reading_latest" ON "hostel"."meter_reading" USING btree ("meter_id" timestamptz_ops,"reading_at" int8_ops);--> statement-breakpoint
CREATE INDEX "ix_consent_student_current" ON "hostel"."tracking_consent" USING btree ("student_id" text_ops,"given_on" text_ops);--> statement-breakpoint
CREATE INDEX "ix_current_status" ON "hostel"."student_current_status" USING btree ("current_status" enum_ops);--> statement-breakpoint
CREATE INDEX "ix_alert_open" ON "hostel"."hostel_alert" USING btree ("facility_id" text_ops,"status" text_ops,"raised_at" text_ops) WHERE (status <> 'Closed'::hostel.alert_status);--> statement-breakpoint
CREATE INDEX "ix_location_access_student" ON "hostel"."location_access_log" USING btree ("student_id" text_ops,"viewed_at" text_ops);--> statement-breakpoint
CREATE INDEX "ix_sick_leave_active" ON "hostel"."sick_leave" USING btree ("from_date" date_ops,"to_date" date_ops) WHERE (status = 'Approved'::hostel.sick_leave_status);--> statement-breakpoint
CREATE INDEX "ix_sick_leave_student" ON "hostel"."sick_leave" USING btree ("student_id" date_ops,"from_date" date_ops);--> statement-breakpoint
CREATE INDEX "ix_outpass_open" ON "hostel"."outpass" USING btree ("status" enum_ops) WHERE (status = ANY (ARRAY['Applied'::hostel.outpass_status, 'Parent_Recommended'::hostel.outpass_status, 'L1_Approved'::hostel.outpass_status, 'L2_Approved'::hostel.outpass_status, 'Approved'::hostel.outpass_status, 'Out'::hostel.outpass_status, 'Overdue'::hostel.outpass_status]));--> statement-breakpoint
CREATE INDEX "ix_outpass_student" ON "hostel"."outpass" USING btree ("student_id" text_ops,"applied_on" timestamptz_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "ux_outpass_in_progress" ON "hostel"."outpass" USING btree ("student_id" text_ops) WHERE (status = ANY (ARRAY['Applied'::hostel.outpass_status, 'Parent_Recommended'::hostel.outpass_status, 'L1_Approved'::hostel.outpass_status, 'L2_Approved'::hostel.outpass_status, 'Approved'::hostel.outpass_status, 'Out'::hostel.outpass_status, 'Overdue'::hostel.outpass_status]));--> statement-breakpoint
CREATE INDEX "movement_event_default_student_id_event_at_idx" ON "hostel"."movement_event_default" USING btree ("student_id" text_ops,"event_at" text_ops);--> statement-breakpoint
CREATE VIEW "portal"."v_po_total" AS (SELECT po_id, sum(round(qty * unit_price * (1::numeric - discount_pct / 100::numeric), 2)) AS sub_total, sum(round(qty * unit_price * (1::numeric - discount_pct / 100::numeric) * (cgst_pct + sgst_pct + igst_pct) / 100::numeric, 2)) AS tax_amount, sum(round(qty * unit_price * (1::numeric - discount_pct / 100::numeric) * (1::numeric + (cgst_pct + sgst_pct + igst_pct) / 100::numeric), 2)) AS grand_total FROM portal.po_line GROUP BY po_id);--> statement-breakpoint
CREATE VIEW "hostel"."v_student_dues" AS (SELECT student_id, fee_head, count(*) AS demands, sum(amount_due) AS amount_due, sum(amount_paid) AS amount_paid, sum(amount_due - amount_paid) FILTER (WHERE status <> 'Waived'::hostel.demand_status) AS balance, min(due_date) FILTER (WHERE status = ANY (ARRAY['Pending'::hostel.demand_status, 'Part_Paid'::hostel.demand_status, 'Overdue'::hostel.demand_status])) AS earliest_due FROM hostel.fee_demand d GROUP BY student_id, fee_head);--> statement-breakpoint
CREATE VIEW "hostel"."v_bed" AS (SELECT ss.subspace_id, ss.subspace_code AS bed_code, ss.status AS bed_status, s.space_id, s.space_code AS room_code, s.space_name AS room_name, s.status AS room_status, z.zone_id, z.zone_name AS floor_name, z.sequence_no AS floor_no, f.facility_id, f.facility_name AS hostel_name, hp.hostel_code, hp.hostel_gender, rp.room_type_id, rt.type_name, rt.sharing_count, rt.is_ac, rp.is_accessible, rp.reserved_for, a.hostel_alloc_id, a.occupant_type, a.student_id, a.staff_id, a.allocation_date FROM infra.subspace ss JOIN infra.space s ON s.space_id::text = ss.space_id::text JOIN infra.zone z ON z.zone_id::text = s.zone_id::text JOIN infra.facility f ON f.facility_id::text = z.facility_id::text JOIN hostel.hostel_profile hp ON hp.facility_id::text = f.facility_id::text LEFT JOIN hostel.room_profile rp ON rp.space_id::text = s.space_id::text LEFT JOIN hostel.room_type rt ON rt.room_type_id = rp.room_type_id LEFT JOIN hostel.hostel_allocation a ON a.subspace_id::text = ss.subspace_id::text AND a.status = 'Active'::hostel.allocation_status WHERE ss.subspace_type = 'Bed'::infra.subspace_type AND s.space_category = 'Hostel_Room'::infra.space_category);--> statement-breakpoint
CREATE VIEW "hostel"."v_vacancy" AS (SELECT facility_id, hostel_name, hostel_code, hostel_gender, room_type_id, type_name, count(*) FILTER (WHERE bed_status = 'Vacant'::infra.subspace_status AND room_status <> 'Under_Maintenance'::infra.space_status AND reserved_for = 'None'::hostel.reserved_for) AS vacant_beds, count(*) FILTER (WHERE bed_status = 'Held'::infra.subspace_status) AS held_beds, count(*) FILTER (WHERE bed_status = 'Occupied'::infra.subspace_status) AS occupied_beds, count(*) AS total_beds FROM hostel.v_bed GROUP BY facility_id, hostel_name, hostel_code, hostel_gender, room_type_id, type_name);--> statement-breakpoint
CREATE VIEW "hostel"."v_registration" AS (SELECT r.registration_id, r.registration_no, r.student_id, sm.full_name, sm.gender, sm.programme, r.academic_year, r.facility_id, hp.hostel_code, r.room_type_id, rt.type_name, r.status, r.applied_on, r.waitlist_no, rd.status AS registration_fee_status, rd.amount_due AS registration_fee, fp.fee_plan_id, fp.plan_type, fp.status AS plan_status, ( SELECT COALESCE(sum(d.amount_due), 0::numeric) AS "coalesce" FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_due, ( SELECT COALESCE(sum(d.amount_paid), 0::numeric) AS "coalesce" FROM hostel.fee_demand d WHERE d.fee_plan_id = fp.fee_plan_id) AS plan_amount_paid, o.offer_id, o.subspace_id, o.student_decision, o.hold_until, a.hostel_alloc_id, a.allocation_date, a.key_no FROM hostel.hostel_registration r JOIN ref.student_master sm ON sm.student_id::text = r.student_id::text JOIN hostel.hostel_profile hp ON hp.facility_id::text = r.facility_id::text JOIN hostel.room_type rt ON rt.room_type_id = r.room_type_id LEFT JOIN hostel.fee_demand rd ON rd.demand_id = r.reg_demand_id LEFT JOIN hostel.fee_plan fp ON fp.registration_id = r.registration_id LEFT JOIN hostel.room_offer o ON o.registration_id = r.registration_id AND (o.student_decision = ANY (ARRAY['Pending'::hostel.student_decision, 'Accepted'::hostel.student_decision])) LEFT JOIN hostel.hostel_allocation a ON a.offer_id = o.offer_id);--> statement-breakpoint
CREATE VIEW "hostel"."v_floors_without_warden" AS (SELECT facility_id, hostel_name, zone_id, floor_name, count(*) AS occupied_beds FROM hostel.v_bed b WHERE bed_status = 'Occupied'::infra.subspace_status AND NOT (EXISTS ( SELECT 1 FROM hostel.staff_space_assignment a WHERE a.facility_id::text = b.facility_id::text AND a.zone_id::text = b.zone_id::text AND a.hostel_role::text = 'Floor_Warden'::text AND a.status = 'Active'::hostel.assignment_status)) GROUP BY facility_id, hostel_name, zone_id, floor_name);--> statement-breakpoint
CREATE VIEW "hostel"."v_space_qr_page" AS (SELECT q.qr_token, s.space_id, s.space_code, s.space_name, s.space_category, z.zone_name, f.facility_name, a.hostel_role, st.full_name, st.mobile_no, a.shift FROM hostel.space_qr q JOIN infra.space s ON s.space_id::text = q.space_id::text JOIN infra.zone z ON z.zone_id::text = s.zone_id::text JOIN infra.facility f ON f.facility_id::text = z.facility_id::text JOIN hostel.staff_space_assignment a ON a.facility_id::text = f.facility_id::text AND a.status = 'Active'::hostel.assignment_status AND a.show_on_qr AND (a.space_id::text = s.space_id::text OR a.space_id IS NULL AND (a.zone_id::text = z.zone_id::text OR a.zone_id IS NULL)) JOIN ref.staff_master st ON st.staff_id::text = a.staff_id::text WHERE q.status = 'Active'::hostel.qr_status);--> statement-breakpoint
CREATE VIEW "hostel"."v_student_location" AS (SELECT sm.student_id, sm.full_name, sm.gender, sm.programme, st.facility_id, st.zone_id, st.space_id, st.subspace_id, cs.current_status, cs.last_event_at, cp.point_name AS last_point, me.direction AS last_direction FROM ref.student_master sm JOIN LATERAL hostel.fn_student_stay(sm.student_id) st(hostel_alloc_id, subspace_id, space_id, zone_id, facility_id) ON true LEFT JOIN hostel.student_current_status cs ON cs.student_id::text = sm.student_id::text LEFT JOIN hostel.movement_event me ON me.event_id = cs.last_event_id AND me.event_at = cs.last_event_at LEFT JOIN hostel.capture_point cp ON cp.point_id = me.point_id WHERE sm.is_hosteller);--> statement-breakpoint
CREATE VIEW "hostel"."v_mess_sick_list" AS (SELECT d.meal_date, d.slot, sl.sick_leave_id, sl.student_id, sm.full_name, st.facility_id, st.space_id, ms.mess_id, ms.cuisine, d.status, d.delivered_by, d.delivered_at FROM hostel.sick_meal_delivery d JOIN hostel.sick_leave sl ON sl.sick_leave_id = d.sick_leave_id AND sl.status = 'Approved'::hostel.sick_leave_status JOIN ref.student_master sm ON sm.student_id::text = sl.student_id::text LEFT JOIN LATERAL hostel.fn_student_stay(sl.student_id) st(hostel_alloc_id, subspace_id, space_id, zone_id, facility_id) ON true LEFT JOIN hostel.mess_subscription ms ON ms.student_id::text = sl.student_id::text AND ms.status = 'Active'::hostel.subscription_status);--> statement-breakpoint
CREATE VIEW "hostel"."v_outpass" AS (SELECT o.outpass_id, o.outpass_no, o.student_id, sm.full_name, st.facility_id, st.zone_id, o.reason, o.destination, o.leave_from, o.return_by, o.outing_category, o.levels_required, o.contact_during_leave, o.status, o.qr_token, o.actual_out_at, o.actual_in_at, o.late_by_minutes, o.applied_on, ( SELECT jsonb_agg(jsonb_build_object('level', s.level, 'role', s.approver_role, 'decision', s.decision, 'by', COALESCE(st_1.full_name, (((c.contact_name::text || ' ('::text) || c.relation) || ')'::text)::character varying), 'on', s.decided_on, 'remarks', s.remarks) ORDER BY s.level) AS jsonb_agg FROM shared.approval_step s LEFT JOIN ref.staff_master st_1 ON st_1.staff_id::text = s.acted_by::text LEFT JOIN hostel.student_contact c ON c.contact_id = s.acted_by_contact WHERE s.request_type = 'Outpass'::shared.request_type AND s.request_id = o.outpass_id) AS steps FROM hostel.outpass o JOIN ref.student_master sm ON sm.student_id::text = o.student_id::text LEFT JOIN LATERAL hostel.fn_student_stay(o.student_id) st(hostel_alloc_id, subspace_id, space_id, zone_id, facility_id) ON true);--> statement-breakpoint
CREATE VIEW "hostel"."v_meter_position" AS (SELECT rm.meter_id, rm.meter_no, rm.space_id, s.space_code, rp.room_type_id, lr.reading_kwh AS last_reading, lr.reading_at AS last_reading_at, COALESCE(mo.reading_kwh, fm.reading_kwh) AS month_opening, lr.reading_kwh - COALESCE(mo.reading_kwh, fm.reading_kwh) AS units_this_month, t.included_units_per_month, rc.units AS recharged_this_month, COALESCE(t.included_units_per_month, 0::numeric) + rc.units - COALESCE(lr.reading_kwh - COALESCE(mo.reading_kwh, fm.reading_kwh), 0::numeric) AS units_left, t.rate_per_unit FROM hostel.room_meter rm JOIN infra.space s ON s.space_id::text = rm.space_id::text JOIN hostel.room_profile rp ON rp.space_id::text = rm.space_id::text LEFT JOIN hostel.electricity_tariff t ON t.room_type_id = rp.room_type_id AND t.approved_by IS NOT NULL AND CURRENT_DATE >= t.effective_from AND (t.effective_to IS NULL OR CURRENT_DATE <= t.effective_to) LEFT JOIN LATERAL ( SELECT r.reading_kwh, r.reading_at FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id ORDER BY r.reading_at DESC LIMIT 1) lr ON true LEFT JOIN LATERAL ( SELECT r.reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at < date_trunc('month'::text, now()) ORDER BY r.reading_at DESC LIMIT 1) mo ON true LEFT JOIN LATERAL ( SELECT r.reading_kwh FROM hostel.meter_reading r WHERE r.meter_id = rm.meter_id AND r.reading_at >= date_trunc('month'::text, now()) ORDER BY r.reading_at LIMIT 1) fm ON true LEFT JOIN LATERAL ( SELECT COALESCE(sum(mr.units_credited), 0::numeric) AS units FROM hostel.meter_recharge mr WHERE mr.meter_id = rm.meter_id AND (mr.status = ANY (ARRAY['Paid'::hostel.recharge_status, 'Credited'::hostel.recharge_status])) AND date_trunc('month'::text, mr.created_at) = date_trunc('month'::text, now())) rc ON true WHERE rm.status = 'Active'::hostel.meter_status);--> statement-breakpoint
CREATE VIEW "hostel"."v_rpt_occupancy_fees_dues" AS (SELECT facility_id, hostel_name, hostel_code, sum(total_beds) AS total_beds, sum(occupied_beds) AS occupied_beds, sum(vacant_beds) AS vacant_beds, sum(held_beds) AS held_beds, ( SELECT count(*) AS count FROM hostel.hostel_registration r WHERE r.facility_id::text = v.facility_id::text AND (r.status <> ALL (ARRAY['Cancelled'::hostel.registration_status, 'Vacated'::hostel.registration_status]))) AS registrations, ( SELECT COALESCE(sum(d.amount_due), 0::numeric) AS "coalesce" FROM hostel.fee_demand d JOIN hostel.hostel_registration r ON r.student_id::text = d.student_id::text AND r.facility_id::text = v.facility_id::text) AS demanded, ( SELECT COALESCE(sum(d.amount_paid), 0::numeric) AS "coalesce" FROM hostel.fee_demand d JOIN hostel.hostel_registration r ON r.student_id::text = d.student_id::text AND r.facility_id::text = v.facility_id::text) AS collected, ( SELECT COALESCE(sum(d.amount_due - d.amount_paid), 0::numeric) AS "coalesce" FROM hostel.fee_demand d JOIN hostel.hostel_registration r ON r.student_id::text = d.student_id::text AND r.facility_id::text = v.facility_id::text WHERE d.status = 'Overdue'::hostel.demand_status) AS overdue, ( SELECT count(DISTINCT d.student_id) AS count FROM hostel.fee_demand d JOIN hostel.hostel_registration r ON r.student_id::text = d.student_id::text AND r.facility_id::text = v.facility_id::text WHERE d.status = 'Overdue'::hostel.demand_status) AS students_overdue FROM hostel.v_vacancy v GROUP BY facility_id, hostel_name, hostel_code);
*/