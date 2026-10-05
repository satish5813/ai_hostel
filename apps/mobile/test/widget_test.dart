import 'package:flutter_test/flutter_test.dart';
import 'package:klu_hostels/core/widgets.dart';

void main() {
  test('rupees in the Indian style', () {
    expect(inr(120000), '₹1,20,000');
    expect(inr('816.00'), '₹816');
  });
  test('words and title case', () {
    expect(words('Evening_Snacks'), 'Evening Snacks');
    expect(titleCase('ARJUN REDDY'), 'Arjun Reddy');
  });
}
