export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Bienvenido a mitama-commerce</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Este es el panel de administración. Los módulos de catálogo, órdenes y clientes
        aparecerán aquí conforme avance el desarrollo.
      </p>

      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Primeros pasos</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            La API corre en{' '}
            <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">
              http://localhost:3000
            </code>{' '}
            con Swagger en{' '}
            <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">/docs</code>.
          </li>
          <li>
            Crea un módulo nuevo con{' '}
            <code className="rounded-sm bg-muted px-1 py-0.5 text-xs">
              yarn new:module &lt;nombre&gt;
            </code>
            .
          </li>
          <li>Las reglas de arquitectura viven en CLAUDE.md y CONTRIBUTING.md.</li>
        </ul>
      </div>
    </div>
  );
}
