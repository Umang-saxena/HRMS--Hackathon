# app/payroll/services.py
from decimal import Decimal, getcontext, ROUND_HALF_UP
from typing import Dict, Any, Optional, List
from datetime import datetime, date, timezone
import json
import logging

from app.supabase_client import supabase
from app.payroll.utils import safe_eval

getcontext().prec = 28
_logger = logging.getLogger(__name__)

# -------------------------
# Helper utilities
# -------------------------
def _extract_data(res):
    """
    Normalise the result from supabase `execute()` which may be:
      - an object with .data (older/newer clients)
      - a dict-like with 'data' key
      - sometimes None on errors
    Returns the .data (list/dict) or None.
    """
    if res is None:
        return None
    # object with .data attribute
    if hasattr(res, "data"):
        return res.data
    # dict-like result
    try:
        if isinstance(res, dict) and "data" in res:
            return res.get("data")
    except Exception:
        pass
    # fallback: if object provides .json() or similar try that
    try:
        if hasattr(res, "json"):
            j = res.json()
            if isinstance(j, dict) and "data" in j:
                return j["data"]
    except Exception:
        pass
    return None

def _to_decimal(x) -> Decimal:
    if x is None:
        return Decimal("0.00")
    return (Decimal(str(x))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def fetch_all(table: str, filters: Optional[List[tuple]] = None):
    q = supabase.table(table).select("*")
    if filters:
        for (col, op, val) in filters:
            if op == 'eq':
                q = q.eq(col, val)
            elif op == 'neq':
                q = q.neq(col, val)
            elif op == 'gte':
                q = q.gte(col, val)
            elif op == 'lte':
                q = q.lte(col, val)
    res = q.execute()
    data = _extract_data(res)
    if not data:
        return []
    return data

# -------------------------
# Load catalog and overrides
# -------------------------
def load_employee_structure(employee_id: Any):
    catalog = fetch_all('salary_components')
    catalog_map = {c['code']: c for c in catalog}
    overrides = fetch_all('employee_salary_components', [('employee_id','eq', employee_id)])
    override_by_compid = {o['component_id']: o for o in overrides}

    comp_map = {}
    for code, comp in catalog_map.items():
        ov = override_by_compid.get(comp['id'])
        calc_value = ov.get('value_override') if ov and ov.get('value_override') else comp.get('calc_value')
        calc_method = ov.get('method_override') if ov and ov.get('method_override') else comp.get('calc_method')
        comp_map[code] = {
            'id': comp['id'],
            'code': code,
            'name': comp.get('name'),
            'type': comp.get('type'),
            'is_taxable': comp.get('is_taxable', True),
            'calc_method': (calc_method or '').upper(),
            'calc_value': str(calc_value or ''),
            'base_component_code': comp.get('base_component_code'),
            'ordering': comp.get('ordering', 100),
            'amount': Decimal('0.00')
        }
    return comp_map

def get_employee_annual_ctc(employee_id: Any) -> Decimal:
    res = supabase.table('employee_salary_assignments').select('*')\
        .eq('employee_id', employee_id).order('effective_from', desc=True).limit(1).execute()
    data = _extract_data(res)
    if res and getattr(res, 'status_code', None) == 200 and data:
        assign = data[0]
        if assign.get('custom_annual_ctc'):
            return _to_decimal(assign['custom_annual_ctc'])
        if assign.get('grade_id'):
            g = supabase.table('employee_grades').select('*').eq('id', assign['grade_id']).single().execute()
            if g and getattr(g, 'status_code', None) == 200 and getattr(g, 'data', None):
                return _to_decimal(g.data.get('annual_ctc'))
    return Decimal('0.00')

def get_active_bonuses_for_period(employee_id: Any, period_start: date, period_end: date):
    resp = supabase.table('employee_bonuses').select('*').eq('employee_id', employee_id).execute()
    if not resp or getattr(resp, 'status_code', None) != 200:
        return []
    bonuses = _extract_data(resp) or []
    result = []
    for b in bonuses:
        ef = b.get('effective_from')
        et = b.get('effective_to')
        ef_date = None
        et_date = None
        if ef:
            ef_date = ef if isinstance(ef, date) else datetime.strptime(str(ef)[:10], '%Y-%m-%d').date()
        if et:
            et_date = et if isinstance(et, date) else datetime.strptime(str(et)[:10], '%Y-%m-%d').date()
        typ = (b.get('bonus_type') or 'ONE_TIME')
        include = False
        if typ == 'ONE_TIME':
            if ef_date and (ef_date >= period_start and ef_date <= period_end) and not b.get('is_paid'):
                include = True
        elif typ == 'RECURRING_MONTHLY':
            include = True
            if ef_date and ef_date > period_end:
                include = False
            if et_date and et_date < period_start:
                include = False
        elif typ == 'RECURRING_YEARLY':
            if ef_date and ef_date.month == period_start.month:
                include = True
                if ef_date and ef_date > period_end:
                    include = False
                if et_date and et_date < period_start:
                    include = False
        if include:
            result.append(b)
    return result

# -------------------------
# Tax helpers (data-driven)
# -------------------------
def load_tax_slabs_for_regime(regime_name: str):
    regimes = fetch_all('tax_regimes')
    sel = None
    for r in regimes:
        if r['name'] == regime_name:
            sel = r
            break
    if not sel:
        return []
    slabs = fetch_all('tax_slabs', [('tax_regime_id','eq', sel['id'])])
    slabs_sorted = sorted(slabs, key=lambda s: Decimal(str(s.get('from_amount', 0))))
    return slabs_sorted

def compute_annual_tax_from_slabs(taxable_income: Decimal, slabs: List[Dict[str, Any]]):
    tax = Decimal('0.00')
    for s in slabs:
        frm = _to_decimal(s.get('from_amount', 0))
        to = s.get('to_amount')
        rate = Decimal(str(s.get('rate_percent', 0)))
        if to is None:
            if taxable_income > frm:
                amount = taxable_income - frm
                tax += (amount * rate) / Decimal('100')
        else:
            to_d = _to_decimal(to)
            if taxable_income > frm:
                taxable_in_slab = min(taxable_income, to_d) - frm
                if taxable_in_slab > 0:
                    tax += (taxable_in_slab * rate) / Decimal('100')
    return tax.quantize(Decimal('0.01'))

# -------------------------
# Main compute function(s)
# -------------------------
def compute_payslip(employee_id: Any, payroll_period_id: int, attendance: Optional[Dict[str,int]] = None, regime: str = 'new') -> Dict[str, Any]:
    if attendance is None:
        attendance = {}
    emp_res = supabase.table('employees').select('*').eq('id', employee_id).single().execute()
    if not emp_res or getattr(emp_res, 'status_code', None) != 200 or not getattr(emp_res, 'data', None):
        raise RuntimeError('Employee not found')
    employee = emp_res.data

    period_res = supabase.table('payroll_periods').select('*').eq('id', payroll_period_id).single().execute()
    if not period_res or getattr(period_res, 'status_code', None) != 200 or not getattr(period_res, 'data', None):
        raise RuntimeError('Payroll period not found')
    period = period_res.data
    period_start = period['period_start'] if isinstance(period['period_start'], date) else datetime.strptime(str(period['period_start'])[:10], '%Y-%m-%d').date()
    period_end = period['period_end'] if isinstance(period['period_end'], date) else datetime.strptime(str(period['period_end'])[:10], '%Y-%m-%d').date()

    annual_ctc = get_employee_annual_ctc(employee_id)
    monthly_ctc = (annual_ctc / Decimal('12')).quantize(Decimal('0.01'))

    comp_map = load_employee_structure(employee_id)
    comp_map['MONTHLY_CTC'] = {
        'code': 'MONTHLY_CTC', 'name': 'Monthly CTC', 'type': 'EARNING', 'is_taxable': True,
        'calc_method': 'FIXED', 'calc_value': str(monthly_ctc), 'amount': monthly_ctc, 'ordering': 0
    }

    computed_cache: Dict[str, Decimal] = {}

    def compute_component(code: str, seen=None) -> Decimal:
        if seen is None:
            seen = set()
        if code in computed_cache:
            return computed_cache[code]
        if code not in comp_map:
            return Decimal('0.00')
        if code in seen:
            raise RuntimeError('circular reference ' + code)
        seen.add(code)
        c = comp_map[code]
        method = (c.get('calc_method') or '').upper()
        val = str(c.get('calc_value') or '')
        if method == 'FIXED':
            amt = Decimal(val or '0')
        elif method == 'PERCENT_OF':
            base = c.get('base_component_code') or 'MONTHLY_CTC'
            base_amt = compute_component(base, seen)
            pct = Decimal(val or '0')
            amt = (base_amt * pct) / Decimal('100')
        elif method == 'FORMULA':
            expr = val
            # Replace tokens carefully so longer tokens match first
            for token in sorted(comp_map.keys(), key=lambda x: -len(x)):
                if token in expr:
                    token_val = compute_component(token, seen)
                    expr = expr.replace(token, str(token_val))
            amt = safe_eval(expr)
        else:
            try:
                amt = Decimal(val or '0')
            except Exception:
                amt = Decimal('0')
        computed_cache[code] = amt.quantize(Decimal('0.01'))
        return computed_cache[code]

    for code in list(comp_map.keys()):
        try:
            compute_component(code)
        except Exception:
            computed_cache[code] = Decimal('0.00')

    # Include active bonuses
    bonuses = get_active_bonuses_for_period(employee_id, period_start, period_end)
    for b in bonuses:
        if b.get('is_percentage'):
            basecode = b.get('percent_of_component') or 'BASIC'
            base_amt = computed_cache.get(basecode) or compute_component(basecode)
            bonus_amt = (base_amt * Decimal(str(b.get('amount') or 0))) / Decimal('100')
        else:
            bonus_amt = Decimal(str(b.get('amount') or 0))
        bonus_amt = bonus_amt.quantize(Decimal('0.01'))
        code = f"BONUS_{b['id']}"
        comp_map[code] = {
            'code': code, 'name': b.get('code') or code, 'type': 'EARNING', 'is_taxable': True,
            'calc_method': 'FIXED', 'calc_value': str(bonus_amt), 'amount': bonus_amt, 'ordering': 5
        }
        computed_cache[code] = bonus_amt

    # Proration based on attendance
    wd = attendance.get('working_days', 0)
    pd = attendance.get('present_days', wd)
    proration = Decimal('1.0')
    if wd and wd > 0:
        proration = (Decimal(str(pd)) / Decimal(str(wd)))

    gross = Decimal('0.00')
    taxable_income = Decimal('0.00')
    total_deductions = Decimal('0.00')
    employer_contrib = Decimal('0.00')

    for code, comp in comp_map.items():
        amt = computed_cache.get(code, Decimal('0.00'))
        if comp.get('type') == 'EARNING':
            amt = (amt * proration).quantize(Decimal('0.01'))
            gross += amt
            if comp.get('is_taxable', True):
                taxable_income += amt
        elif comp.get('type') == 'DEDUCTION':
            total_deductions += amt
        elif comp.get('type') == 'EMPLOYER_CONTRIBUTION':
            employer_contrib += amt

    annual_taxable = (taxable_income * Decimal('12')).quantize(Decimal('0.01'))
    slabs = load_tax_slabs_for_regime(regime)
    annual_tax = compute_annual_tax_from_slabs(annual_taxable, slabs) if slabs else Decimal('0.00')
    monthly_income_tax = (annual_tax / Decimal('12')).quantize(Decimal('0.01'))

    prof_tax = Decimal('0.00')
    state = employee.get('work_state')
    if state:
        ptrs = supabase.table('professional_tax_rules').select('*').eq('state_code', state).execute()
        if ptrs and getattr(ptrs, 'status_code', None) == 200 and getattr(ptrs, 'data', None):
            for p in ptrs.data:
                min_s = _to_decimal(p.get('min_monthly_salary') or 0)
                max_s = _to_decimal(p.get('max_monthly_salary') or 999999999)
                if monthly_ctc >= min_s and monthly_ctc <= max_s:
                    prof_tax = _to_decimal(p.get('monthly_amount') or 0)
                    break

    total_deductions = (total_deductions + monthly_income_tax + prof_tax).quantize(Decimal('0.01'))
    net = (gross - total_deductions).quantize(Decimal('0.01'))
    total_employer_cost = (gross + employer_contrib).quantize(Decimal('0.01'))

    breakdown = {}
    for code in sorted(comp_map.keys(), key=lambda k: comp_map[k].get('ordering', 100)):
        amount = computed_cache.get(code) or comp_map[code].get('amount') or Decimal('0.00')
        breakdown[code] = {'amount': float(amount.quantize(Decimal('0.01'))), 'type': comp_map[code].get('type'), 'is_taxable': comp_map[code].get('is_taxable', True)}

    breakdown['INCOME_TAX'] = {'amount': float(monthly_income_tax), 'type': 'DEDUCTION'}
    breakdown['PROFESSIONAL_TAX'] = {'amount': float(prof_tax), 'type': 'DEDUCTION'}

    payslip = {
        'employee_id': employee_id,
        'payroll_period_id': payroll_period_id,
        'gross_salary': float(gross),
        'total_deductions': float(total_deductions),
        'net_salary': float(net),
        'total_employer_cost': float(total_employer_cost),
        'breakdown': breakdown,
        'computed_at': datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
    }

    return payslip

# -------------------------
# Persist payslip -> your existing `payroll` table
# -------------------------
def persist_payslip(payslip: dict) -> dict:
    """
    Persist to the existing `payroll` table.
    Expects `payslip` format returned by compute_payslip.
    Uses upsert if available, otherwise fallback to insert/update.
    """
    emp_id = payslip.get('employee_id')
    payroll_period_id = payslip.get('payroll_period_id')
    gross = _to_decimal(payslip.get('gross_salary', 0))
    total_deductions = _to_decimal(payslip.get('total_deductions', 0))
    net = _to_decimal(payslip.get('net_salary', 0))
    total_employer_cost = _to_decimal(payslip.get('total_employer_cost', 0))
    breakdown = payslip.get('breakdown', {})

    # Try to determine a base_salary if BASIC present, otherwise fallback to gross
    base_salary = Decimal('0.00')
    try:
        if isinstance(breakdown, dict) and 'BASIC' in breakdown:
            b = breakdown['BASIC']
            base_salary = _to_decimal(b.get('amount') if isinstance(b, dict) else b)
        else:
            base_salary = gross
    except Exception:
        base_salary = gross

    allowances = (gross - base_salary).quantize(Decimal('0.01'))
    now_iso = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()

    data = {
        'employee_id': emp_id,
        'payroll_period_id': payroll_period_id,
        # keep `month` untouched unless you choose to populate it from payroll_periods
        'base_salary': float(base_salary),
        'allowances': float(allowances),
        'deductions': float(total_deductions),
        'net_salary': float(net),
        'gross_salary': float(gross),
        'total_deductions': float(total_deductions),
        'total_employer_cost': float(total_employer_cost),
        'breakdown': breakdown,
        'payment_status': 'PENDING',
        'created_at': now_iso,
        'updated_at': now_iso,
        'status': 'DRAFT'
    }

    # If payroll_period_id present, attempt to fill month from payroll_periods.period_start (optional)
    if payroll_period_id:
        try:
            pr = supabase.table('payroll_periods').select('period_start').eq('id', payroll_period_id).single().execute()
            if pr and getattr(pr, 'status_code', None) == 200 and getattr(pr, 'data', None):
                period_start = pr.data.get('period_start')
                if period_start:
                    # store period_start into month field (your payroll.month is date)
                    data['month'] = period_start
        except Exception:
            pass

    # Attempt upsert. Many supabase python clients have upsert(), some use insert(...).on_conflict.
    try:
        # prefer .upsert if available
        upsert_fn = getattr(supabase.table('payroll'), 'upsert', None)
        if upsert_fn:
            # on_conflict should match the unique constraint you created (employee_id, payroll_period_id)
            res = supabase.table('payroll').upsert(data, on_conflict=['employee_id', 'payroll_period_id']).execute()
        else:
            # fallback: try insert, handle duplicate error by update
            res = supabase.table('payroll').insert(data).execute()
    except Exception as exc:
        _logger.debug("Upsert via client failed: %s. Falling back to check+insert/update.", exc)
        # fallback check existing
        existing = supabase.table('payroll').select('*')\
            .eq('employee_id', emp_id).eq('payroll_period_id', payroll_period_id).limit(1).execute()
        ext = _extract_data(existing)
        if ext and len(ext) > 0:
            existing_id = ext[0]['id']
            res = supabase.table('payroll').update(data).eq('id', existing_id).execute()
        else:
            res = supabase.table('payroll').insert(data).execute()

    # Validate response
    if not res:
        raise RuntimeError('Failed to persist payslip: no response from DB')
    status_code = getattr(res, 'status_code', None)
    if status_code not in (200, 201):
        # try to include data for debugging
        raise RuntimeError(f'Failed to persist payslip: status={status_code} data={getattr(res, "data", str(res))}')

    out = _extract_data(res)
    if isinstance(out, list) and out:
        return out[0]
    return out or {}

# -------------------------
# Run payroll for a period (bulk)
# -------------------------
def run_payroll_for_period(payroll_period_id: int, run_by: Optional[str] = None) -> Dict[str, Any]:
    started_at = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
    run_insert = {
        'payroll_period_id': payroll_period_id,
        'run_by': run_by,
        'status': 'IN_PROGRESS',
        'started_at': started_at
    }
    run_res = supabase.table('payroll_runs').insert(run_insert).execute()
    if not run_res or getattr(run_res, 'status_code', None) not in (200, 201):
        raise RuntimeError('Failed to create payroll run')
    run = _extract_data(run_res)[0]

    emps = fetch_all('employees', [('is_active','eq', True)])
    results = {'total': len(emps), 'succeeded': 0, 'failed': 0, 'errors': []}
    for e in emps:
        try:
            payslip = compute_payslip(e['id'], payroll_period_id, {}, 'new')
            persist_payslip(payslip)
            results['succeeded'] += 1
        except Exception as ex:
            _logger.exception("Failed to compute/persist for employee %s: %s", e.get('id'), ex)
            results['failed'] += 1
            results['errors'].append({'employee_id': e.get('id'), 'error': str(ex)})

    completed_at = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
    supabase.table('payroll_runs').update({'status': 'COMPLETED', 'completed_at': completed_at}).eq('id', run['id']).execute()
    return results
