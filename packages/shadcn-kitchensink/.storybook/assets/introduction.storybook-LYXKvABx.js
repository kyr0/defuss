import{j as e,a as r,F as i}from"./index-DP1mjfDI.js";const l={title:"Introduction",order:0};function o(t){const n={code:"code",h1:"h1",h2:"h2",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...t.components};return r(i,{children:[e(n.h1,{children:"defuss-shadcn Component Library"}),`
`,r(n.p,{children:["Welcome to the ",e(n.strong,{children:"defuss-shadcn"})," component library documentation."]}),`
`,e(n.h2,{children:"Overview"}),`
`,r(n.p,{children:[e(n.code,{children:"defuss-shadcn"})," provides composable UI primitives built on ",e(n.strong,{children:"Tailwind 4"})," and ",e(n.strong,{children:"Basecoat UI"})," conventions. All components work with defuss' real DOM morphing engine - no virtual DOM overhead."]}),`
`,e(n.h2,{children:"Key Features"}),`
`,r(n.ul,{children:[`
`,r(n.li,{children:[e(n.strong,{children:"Real DOM"}),": Components render directly to the DOM, no reconciliation needed"]}),`
`,r(n.li,{children:[e(n.strong,{children:"Composable"}),": Build complex UIs by combining simple primitives"]}),`
`,r(n.li,{children:[e(n.strong,{children:"Accessible"}),": ARIA attributes and keyboard navigation built-in"]}),`
`,r(n.li,{children:[e(n.strong,{children:"Themeable"}),": Full dark mode support with CSS custom properties"]}),`
`,r(n.li,{children:[e(n.strong,{children:"Lightweight"}),": No framework bloat - just the components you use"]}),`
`]}),`
`,e(n.h2,{children:"Getting Started"}),`
`,e(n.p,{children:"Install the library:"}),`
`,e(n.pre,{children:e(n.code,{className:"language-bash",children:`bun add defuss-shadcn
`})}),`
`,e(n.p,{children:"Import Tailwind and Basecoat styles in your app stylesheet:"}),`
`,e(n.pre,{children:e(n.code,{className:"language-css",children:`@import "tailwindcss";
@import "basecoat-css";
`})}),`
`,e(n.p,{children:"Then use components in your JSX:"}),`
`,e(n.pre,{children:e(n.code,{className:"language-tsx",children:`import { Button, Card, CardHeader, CardTitle, CardContent } from "defuss-shadcn";

const App = () => (
  <Card className="max-w-md">
    <CardHeader>
      <CardTitle>Hello defuss-shadcn</CardTitle>
    </CardHeader>
    <CardContent>
      <Button>Get Started</Button>
    </CardContent>
  </Card>
);
`})}),`
`,e(n.h2,{children:"Available Components"}),`
`,e(n.p,{children:"Browse the sidebar to explore all available components with live previews and prop controls."})]})}function a(t={}){const{wrapper:n}=t.components||{};return n?e(n,{...t,children:e(o,{...t})}):o(t)}export{a as default,l as meta};
