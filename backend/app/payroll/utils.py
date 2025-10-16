# app/payroll/utils.py
import ast
from decimal import Decimal, ROUND_HALF_UP

def safe_eval(expr: str) -> Decimal:
    # same AST-based implementation you used before
    tree = ast.parse(expr, mode='eval')
    allowed = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Add, ast.Sub, ast.Mult,
               ast.Div, ast.Pow, ast.Mod, ast.Num, ast.Constant, ast.Load,
               ast.UAdd, ast.USub, ast.FloorDiv)
    for node in ast.walk(tree):
        if not isinstance(node, allowed):
            raise ValueError(f"Unsupported expression element: {type(node).__name__}")

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return Decimal(str(node.value))
            raise ValueError("Only numeric constants allowed")
        if isinstance(node, ast.Num):
            return Decimal(str(node.n))
        if isinstance(node, ast.BinOp):
            left = _eval(node.left); right = _eval(node.right)
            if isinstance(node.op, ast.Add): return left + right
            if isinstance(node.op, ast.Sub): return left - right
            if isinstance(node.op, ast.Mult): return left * right
            if isinstance(node.op, ast.Div): return left / right
            if isinstance(node.op, ast.Pow): return left ** right
            if isinstance(node.op, ast.Mod): return left % right
            if isinstance(node.op, ast.FloorDiv): return left // right
            raise ValueError("Unsupported binary op")
        if isinstance(node, ast.UnaryOp):
            val = _eval(node.operand)
            if isinstance(node.op, ast.UAdd): return +val
            if isinstance(node.op, ast.USub): return -val
            raise ValueError("Unsupported unary op")
        raise ValueError("Unsupported AST node")
    res = _eval(tree)
    return res.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
