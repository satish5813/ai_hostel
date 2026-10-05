"""Writes db/migrations/102_mess_routine_menu.sql: the weekly routine menu tables and the starter menus.

Every menu is one week (Monday to Sunday) of four meals for one combination of
  hostel        Boys | Girls
  food          South Indian | North Indian | International (by country, for apartments and overseas students)
  diet          Veg | Non-veg
The starter menus are drafts of a mess committee's work: the administrator edits them and the Chief Warden approves.

Run: python scripts/gen-102-menus.py
"""
import pathlib

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
SLOTS = {'B': 'Breakfast', 'L': 'Lunch', 'S': 'Evening_Snacks', 'D': 'Dinner'}

# Each food style: seven breakfasts, lunches, snacks and dinners (vegetarian), then the non-veg changes.
# A change is either the whole meal, or '+ item' to add an item. Days are 0 = Monday ... 6 = Sunday.
MENUS = {
    ('South', None): dict(
        B=['Idli, sambar, coconut chutney, tea or coffee', 'Ven pongal, medu vada, sambar, coconut chutney, tea or coffee', 'Upma, peanut chutney, banana, tea or coffee',
           'Plain dosa, sambar, tomato chutney, tea or coffee', 'Pesarattu, upma, ginger chutney, tea or coffee', 'Poori, potato masala, tea or coffee', 'Masala dosa, sambar, coconut chutney, tea or coffee'],
        L=['Rice, sambar, beans poriyal, rasam, curd, papad', 'Rice, tomato dal, cabbage fry, rasam, curd, mango pickle', 'Lemon rice, rice, potato fry, sambar, curd',
           'Rice, gongura dal, bhindi fry, rasam, buttermilk', 'Rice, chapati, mixed veg kurma, rasam, curd', 'Veg biryani, onion raita, mirchi ka salan', 'Rice, drumstick sambar, potato fry, rasam, curd, semiya payasam'],
        S=['Mirchi bajji, tea', 'Chana sundal, coffee', 'Onion pakoda, tea', 'Masala biscuits, tea', 'Punugulu, coconut chutney, tea', 'Veg puff, tea', 'Mysore bonda, coffee'],
        D=['Chapati, dal fry, rice, rasam, curd', 'Rice, sambar, aloo curry, chapati, curd', 'Chapati, chana masala, rice, rasam, curd', 'Rice, dal, tindora fry, chapati, curd',
           'Veg pulao, raita, dal, rasam', 'Chapati, paneer butter masala, rice, dal, curd', 'Rice, tomato rasam, cabbage curry, chapati, curd'],
        NV={(1, 'B'): '+ boiled egg', (3, 'B'): '+ egg omelette', (5, 'B'): '+ boiled egg', (2, 'L'): 'Lemon rice, rice, Andhra chicken curry, sambar, curd',
            (6, 'L'): 'Chicken biryani, onion raita, mirchi ka salan, semiya payasam', (3, 'S'): 'Egg puff, tea', (4, 'D'): 'Veg pulao, egg curry, raita, rasam',
            (5, 'D'): 'Chapati, fish curry, rice, dal, curd'}),
    ('North', None): dict(
        B=['Aloo paratha, curd, pickle, tea', 'Poha, sev, jalebi, tea', 'Bread, butter, jam, tea', 'Methi paratha, curd, tea', 'Vegetable daliya, bread toast, tea', 'Puri, aloo sabzi, tea', 'Chole bhature, lassi'],
        L=['Rajma, jeera rice, roti, green salad', 'Dal makhani, aloo gobi, rice, roti', 'Kadhi pakora, bhindi masala, rice, roti', 'Chole, rice, roti, boondi raita',
           'Dal tadka, mix veg, rice, roti, salad', 'Veg pulao, dal, roti, boondi raita', 'Paneer butter masala, jeera rice, butter naan, gulab jamun'],
        S=['Samosa, green chutney, tea', 'Bread pakoda, tea', 'Kachori, tamarind chutney, tea', 'Aloo tikki chaat, tea', 'Dhokla, tea', 'Pav bhaji, tea', 'Veg sandwich, cold coffee'],
        D=['Arhar dal, aloo matar, rice, roti', 'Mix veg, dal, rice, roti, kheer', 'Palak dal, aloo jeera, rice, roti', 'Kadai veg, dal, rice, roti', 'Matar paneer, dal, rice, roti',
           'Khichdi, kadhi, papad, pickle', 'Malai kofta, dal fry, rice, roti'],
        NV={(1, 'B'): '+ egg bhurji', (3, 'B'): '+ boiled egg', (5, 'B'): '+ masala omelette', (2, 'L'): 'Chicken curry, bhindi masala, rice, roti',
            (6, 'L'): 'Chicken biryani, raita, butter naan, gulab jamun', (4, 'D'): 'Egg curry, dal, rice, roti', (6, 'D'): 'Butter chicken, dal fry, rice, roti'}),
    ('International', 'Nepal'): dict(
        B=['Chiura (beaten rice), aloo tama, milk tea', 'Sel roti, aloo dum, milk tea', 'Aloo paratha, achar, milk tea', 'Puri, chana tarkari, milk tea',
           'Roti, mixed veg tarkari, milk tea', 'Veg chowmein, milk tea', 'Sel roti, chana, milk tea'],
        L=['Dal bhat, aloo cauli tarkari, saag, achar', 'Dal bhat, gundruk soup, aloo tarkari, achar', 'Dal bhat, kwati (mixed bean soup), saag, achar', 'Dal bhat, pumpkin tarkari, mula achar',
           'Dal bhat, rayo saag, aloo bodi tarkari, achar', 'Veg fried rice, aloo dum, achar', 'Dal bhat, paneer tarkari, saag, achar, kheer'],
        S=['Veg momo, tomato achar, tea', 'Chatpate, tea', 'Noodle sadeko, tea', 'Pakoda, tea', 'Aloo chop, tea', 'Veg momo, tea', 'Samosa, tea'],
        D=['Roti, dal, aloo tama, rice', 'Veg thukpa', 'Roti, chana masala, dal, rice', 'Dal bhat, mixed veg tarkari', 'Veg thukpa, roti', 'Dhido, gundruk, saag, dal', 'Roti, paneer curry, dal, rice'],
        NV={(1, 'B'): '+ boiled egg', (4, 'B'): '+ egg omelette', (2, 'L'): 'Dal bhat, chicken curry, saag, achar', (6, 'L'): 'Dal bhat, mutton curry, saag, achar, kheer',
            (0, 'S'): 'Chicken momo, tomato achar, tea', (5, 'S'): 'Chicken momo, tea', (1, 'D'): 'Chicken thukpa', (6, 'D'): 'Roti, egg curry, dal, rice'}),
    ('International', 'Bangladesh'): dict(
        B=['Luchi, alu dom, tea', 'Paratha, mixed vegetable bhaji, tea', 'Khichuri, begun bhaja, tea', 'Roti, dal, alu bhaji, tea', 'Chira doi (flattened rice with curd), banana, tea',
           'Paratha, chana ghugni, tea', 'Luchi, cholar dal, rasgulla, tea'],
        L=['Bhaat, masoor dal, alu posto, shukto', 'Bhaat, moong dal, begun bhaja, lau ghonto', 'Bhaat, dal, mixed veg chorchori, tomato chutney', 'Bhaat, masoor dal, dhokar dalna, achar',
           'Polao, alu dom, salad, mishti doi', 'Bhaat, dal, potol bhaja, shak bhaji', 'Khichuri, labra, papad, chutney'],
        S=['Jhalmuri, tea', 'Singara, tea', 'Piyaju, tea', 'Beguni, muri, tea', 'Chanachur, tea', 'Vegetable chop, tea', 'Sandesh, tea'],
        D=['Roti, dal, alu kopi, bhaat', 'Bhaat, dal, paneer dalna', 'Roti, cholar dal, mixed veg', 'Bhaat, dal, alu bhaji, begun bhaja', 'Roti, chana masala, bhaat',
           'Bhaat, dal, mochar ghonto', 'Roti, dal, alur dom, payesh'],
        NV={(1, 'B'): 'Paratha, egg bhuna, tea', (5, 'B'): '+ egg omelette', (0, 'L'): 'Bhaat, masoor dal, rui macher jhol, shukto', (2, 'L'): 'Bhaat, dal, chicken curry, tomato chutney',
            (4, 'L'): 'Polao, chicken korma, salad, mishti doi', (1, 'D'): 'Bhaat, dal, egg curry', (5, 'D'): 'Bhaat, dal, fish bhuna'}),
    ('International', 'Sri Lanka'): dict(
        B=['String hoppers, dhal curry, coconut sambol, tea', 'Kiribath, lunu miris, banana, tea', 'Pol roti, katta sambol, dhal curry, tea', 'Hoppers, onion sambol, tea',
           'Bread, dhal curry, coconut sambol, tea', 'Pittu, coconut milk, dhal curry, tea', 'String hoppers, potato kirihodi, sambol, tea'],
        L=['Rice, dhal curry, pumpkin curry, gotukola sambol, papadam', 'Rice, beans curry, potato curry, mallung', 'Rice, dhal, brinjal moju, carrot salad', 'Rice, polos (jackfruit) curry, dhal, mallung',
           'Yellow rice, cashew curry, dhal, salad', 'Rice, ash plantain curry, dhal, beetroot curry', 'Vegetable lamprais, wattalappam'],
        S=['Vegetable roti, tea', 'Vegetable patties, tea', 'Ulundu vadai, tea', 'Boiled chickpeas with coconut, tea', 'Parippu vadai, tea', 'Banana fritters, tea', 'Kokis, tea'],
        D=['Vegetable kottu roti', 'String hoppers, kiri hodi, dhal', 'Rice, dhal, beans curry, sambol', 'Pittu, dhal, coconut sambol', 'Vegetable fried rice, chili paste, salad',
           'Rice, dhal, potato curry, mallung', 'Hoppers, dhal curry, onion sambol'],
        NV={(1, 'B'): '+ boiled egg', (3, 'B'): 'Egg hoppers, onion sambol, tea', (0, 'L'): 'Rice, dhal curry, chicken curry, gotukola sambol, papadam',
            (3, 'L'): 'Rice, fish ambul thiyal, dhal, mallung', (6, 'L'): 'Chicken lamprais, wattalappam', (0, 'D'): 'Chicken kottu roti', (4, 'D'): 'Egg fried rice, chili paste, salad'}),
    ('International', 'Nigeria'): dict(
        B=['Akara, pap (ogi), tea', 'Boiled yam, garden egg sauce, tea', 'Moi moi, pap, tea', 'Bread, ewa agoyin (beans), tea', 'Dodo (fried plantain), beans porridge, tea',
           'Custard, akara, tea', 'Yam porridge (asaro), tea'],
        L=['Jollof rice, dodo, coleslaw', 'Eba, vegetable egusi soup, steamed spinach', 'White rice, vegetable stew, beans', 'Pounded yam, efo riro, okra',
           'Fried rice, moi moi, salad', 'Amala, ewedu, gbegiri', 'Jollof rice, moi moi, dodo, salad'],
        S=['Puff puff, tea', 'Chin chin, tea', 'Boli (roasted plantain), groundnuts', 'Buns, tea', 'Yam chips, pepper sauce', 'Puff puff, zobo', 'Chin chin, kunu'],
        D=['Beans porridge, dodo', 'White rice, tomato stew, beans', 'Yam pottage', 'Spaghetti jollof, salad', 'Eba, vegetable okra soup', 'Jollof rice, coleslaw', 'Semovita, vegetable soup'],
        NV={(1, 'B'): 'Boiled yam, egg sauce, tea', (5, 'B'): '+ boiled egg', (0, 'L'): 'Jollof rice, fried chicken, dodo, coleslaw', (1, 'L'): 'Eba, egusi soup with chicken, steamed spinach',
            (6, 'L'): 'Jollof rice, chicken stew, moi moi, dodo', (5, 'S'): 'Chicken pie, zobo', (2, 'D'): 'Yam pottage with fish', (4, 'D'): 'Eba, okra soup with fish'}),
    ('International', 'Ethiopia'): dict(
        # Wednesday and Friday are fasting days (no meat, egg or dairy), so the non-veg menu leaves them alone
        B=['Firfir (injera in berbere sauce), tea', 'Chechebsa, honey, tea', 'Ful (fava beans), bread, tea', 'Kinche (cracked wheat), tea', 'Injera, shiro, tea',
           'Genfo, niter kibbeh, berbere, tea', 'Kita firfir, yoghurt, tea'],
        L=['Injera, misir wot, gomen, salad', 'Injera, shiro wot, atkilt wat', 'Injera, beyaynetu (fasting platter)', 'Rice, misir wot, salad',
           'Injera, shiro, gomen, timatim salata', 'Pasta with tomato sauce, salad', 'Injera, kik alicha, atkilt wat, ayib'],
        S=['Kolo (roasted barley), coffee', 'Lentil sambusa, tea', 'Dabo kolo, tea', 'Roasted chickpeas, coffee', 'Lentil sambusa, tea', 'Kolo, buna (coffee)', 'Banana, popcorn, coffee'],
        D=['Injera, shiro, gomen', 'Rice, atkilt wat, salad', 'Injera, misir wot', 'Injera, kik alicha, gomen', 'Pasta, tomato sauce, salad', 'Injera, shiro, timatim salata', 'Injera, misir wot, atkilt wat'],
        NV={(0, 'B'): 'Enkulal firfir (scrambled egg), bread, tea', (6, 'B'): 'Kita firfir, enkulal (egg), tea', (0, 'L'): 'Injera, doro wat, misir wot, gomen',
            (3, 'L'): 'Rice, chicken tibs, salad', (6, 'L'): 'Injera, doro wat with egg, ayib, gomen', (1, 'D'): 'Rice, chicken alicha, salad', (5, 'D'): 'Injera, asa (fish) tibs, timatim salata'}),
}
FASTING = {('International', 'Ethiopia'): {2, 4}}
# one extra protein at a boys' hostel breakfast when the menu is vegetarian (or on a fasting day)
VEG_PROTEIN = {'South': 'sprouts salad', 'North': 'sprouts salad', 'Nepal': 'boiled chana', 'Bangladesh': 'boiled chana', 'Sri Lanka': 'boiled chickpeas',
               'Nigeria': 'roasted groundnuts', 'Ethiopia': 'roasted chickpeas'}
LABEL = {'South': 'South Indian', 'North': 'North Indian'}


DRINKS = ('tea', 'coffee', 'tea or coffee', 'milk tea', 'lemon tea', 'cold coffee', 'lassi', 'kunu', 'zobo', 'buna (coffee)')


def add(meal: str, item: str) -> str:
    """Adds an item to a meal, before the drink that closes it."""
    if item.split(' ')[-1] in meal: return meal
    parts = meal.split(', ')
    if parts[-1] in DRINKS: return ', '.join(parts[:-1] + [item, parts[-1]])
    return f'{meal}, {item}'


def week(key, diet, gender):
    m = MENUS[key]
    region, country = key
    out = {}
    for d in range(7):
        for s in 'BLSD':
            meal = m[s][d]
            if diet == 'Non_Veg':
                ch = m['NV'].get((d, s))
                if ch:
                    meal = add(meal, ch[2:]) if ch.startswith('+ ') else ch
            # the hostel's own touches: Girls get fruit at breakfast, a salad at dinner and a light snack mid-week;
            # Boys get one more protein at breakfast and a banana at dinner
            if gender == 'Girls':
                if s == 'B': meal = add(meal, 'seasonal fruit')
                if s == 'D': meal = add(meal, 'green salad')
                if s == 'S' and d == 2: meal = 'Fruit bowl, lemon tea'
            else:
                if s == 'B':
                    fast = d in FASTING.get(key, set())
                    has_egg = 'egg' in meal.lower() or 'enkulal' in meal.lower()
                    if diet == 'Non_Veg' and not fast and not has_egg: meal = add(meal, 'boiled egg')
                    elif diet == 'Veg' or fast: meal = add(meal, VEG_PROTEIN[country or region])
                if s == 'D': meal = add(meal, 'banana')
            out[(d + 1, SLOTS[s])] = meal
    return out


q = lambda v: 'NULL' if v is None else "'" + str(v).replace("'", "''") + "'"
sql = [open(pathlib.Path(__file__).with_name('gen-102-head.sql'), encoding='utf8').read()]
sql.append('\n-- ---------- starter routine menus (generated by scripts/gen-102-menus.py) ----------')
for key in MENUS:
    region, country = key
    for gender in ('Boys', 'Girls'):
        for diet in ('Veg', 'Non_Veg'):
            title = f"{gender} · {LABEL.get(region, country)} · {'Veg' if diet == 'Veg' else 'Non-veg'}"
            note = 'Wednesday and Friday are fasting days.' if key in FASTING else None
            items = week(key, diet, gender)
            values = ',\n    '.join(f'({d}, {q(meal)}::hostel.meal_slot, {q(dish)})' for (d, meal), dish in sorted(items.items(), key=lambda x: (x[0][0], list(SLOTS.values()).index(x[0][1]))))
            sql.append(f"""WITH c AS (
  INSERT INTO hostel.menu_cycle (hostel_gender, region, country, diet, title, notes, status, approved_on, created_by)
  VALUES ({q(gender)}, {q(region)}, {q(country)}, {q(diet)}, {q(title)}, {q(note)}, 'Approved', now(), 'system') RETURNING cycle_id)
INSERT INTO hostel.menu_cycle_item (cycle_id, day_no, meal, dishes)
SELECT c.cycle_id, v.d, v.m, v.x FROM c, (VALUES
    {values}) AS v(d, m, x);""")
out = pathlib.Path(__file__).resolve().parents[1] / 'db' / 'migrations' / '102_mess_routine_menu.sql'
out.write_text('\n'.join(sql) + '\n', encoding='utf8')
print(out, sum(1 for _ in MENUS) * 4, 'menus')
