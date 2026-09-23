from app.parser.ast_parser import detect_language, parse_source_code


def test_detect_language():
    assert detect_language("app/main.py") == "python"
    assert detect_language("src/index.js") == "javascript"
    assert detect_language("src/components/App.jsx") == "javascript"
    assert detect_language("src/types.ts") == "typescript"
    assert detect_language("src/App.tsx") == "tsx"
    assert detect_language("com/example/Main.java") == "java"
    assert detect_language("pkg/server/main.go") == "go"
    assert detect_language("README.md") == "markdown"
    assert detect_language("unknown.xyz") == "text"


def test_parse_python_code():
    code = """
def calculate_sum(a: int, b: int) -> int:
    \"\"\"Calculates sum of two integers.\"\"\"
    return a + b

class MathService:
    def multiply(self, x, y):
        return x * y
"""
    tree, lang = parse_source_code(code, "service.py")
    assert lang == "python"
    assert tree is not None
    assert tree.root_node.type == "module"


def test_parse_javascript_code():
    code = """
export async function fetchUserData(userId) {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
}
"""
    tree, lang = parse_source_code(code, "api.js")
    assert lang == "javascript"
    assert tree is not None
    assert tree.root_node.type == "program"


def test_parse_typescript_and_tsx():
    ts_code = "interface User { id: string; name: string; }"
    tree_ts, lang_ts = parse_source_code(ts_code, "types.ts")
    assert lang_ts == "typescript"
    assert tree_ts is not None

    tsx_code = "export const Button = ({ label }: { label: string }) => <button>{label}</button>;"
    tree_tsx, lang_tsx = parse_source_code(tsx_code, "Button.tsx")
    assert lang_tsx == "tsx"
    assert tree_tsx is not None


def test_parse_java_and_go():
    java_code = """
public class Application {
    public static void main(String[] args) {
        System.out.println("Hello CodeLens");
    }
}
"""
    tree_java, lang_java = parse_source_code(java_code, "Application.java")
    assert lang_java == "java"
    assert tree_java is not None

    go_code = """
package main

import "fmt"

func main() {
    fmt.Println("CodeLens Engine")
}
"""
    tree_go, lang_go = parse_source_code(go_code, "main.go")
    assert lang_go == "go"
    assert tree_go is not None
