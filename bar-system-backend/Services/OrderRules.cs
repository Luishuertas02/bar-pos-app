using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Query;

namespace bar_system_backend.Services;

// Reglas de órdenes compartidas entre mesas y pedidos
public static class OrderRules
{
    // Valores del option set cra58_status de cra58_order
    public const int StatusAbierto = 962000000;
    public const int StatusCerrado = 962000001;

    public static readonly ColumnSet OrderColumns =
        new("cra58_ordernumber", "cra58_productsnumber", "cra58_total", "cra58_status", "createdon");

    // Orden abierta de una mesa (sus órdenes se numeran {mesa}_001, {mesa}_002, ...)
    public static Entity? FindOpenOrder(IOrganizationService service, string tableId)
    {
        var query = new QueryExpression("cra58_order")
        {
            ColumnSet = OrderColumns,
            Criteria = new FilterExpression
            {
                Conditions =
                {
                    new ConditionExpression("cra58_ordernumber", ConditionOperator.BeginsWith, $"{tableId}_"),
                    new ConditionExpression("cra58_status", ConditionOperator.Equal, StatusAbierto)
                }
            },
            Orders = { new OrderExpression("createdon", OrderType.Descending) },
            TopCount = 1
        };

        return service.RetrieveMultiple(query).Entities.FirstOrDefault();
    }

    // Orden nueva y vacía para la mesa, con el siguiente número: Me1_001, Me1_002, ...
    public static Entity NewOrderForTable(IOrganizationService service, string tableId)
    {
        var prefix = $"{tableId}_";
        var last = FindLastNumber(service, "cra58_order", "cra58_ordernumber", prefix);

        return new Entity("cra58_order")
        {
            ["cra58_ordernumber"] = $"{prefix}{last + 1:D3}",
            ["cra58_productsnumber"] = 0,
            ["cra58_total"] = new Money(0),
            ["cra58_status"] = new OptionSetValue(StatusAbierto)
        };
    }

    // Peticiones para cerrar una orden: pasa a Cerrado y se borran sus pedidos para liberar
    // espacio. La orden conserva su número de productos y su total como resumen.
    public static List<OrganizationRequest> CloseOrderRequests(IOrganizationService service, Entity order)
    {
        var close = new Entity("cra58_order", order.Id)
        {
            ["cra58_status"] = new OptionSetValue(StatusCerrado)
        };

        var requests = new List<OrganizationRequest> { new UpdateRequest { Target = close } };

        var details = new QueryExpression("cra58_orderdetail")
        {
            ColumnSet = new ColumnSet(false),
            Criteria = new FilterExpression
            {
                Conditions = { new ConditionExpression("cra58_ordernumber", ConditionOperator.Equal, order.Id) }
            }
        };

        requests.AddRange(service.RetrieveMultiple(details).Entities
            .Select(d => new DeleteRequest { Target = d.ToEntityReference() }));

        return requests;
    }

    // Siguiente número de pedido dentro de la orden: cada orden empieza en R_001
    public static string NextRequestNumber(IOrganizationService service, Guid orderId)
    {
        var last = FindLastNumber(
            service,
            "cra58_orderdetail",
            "cra58_requestnumber",
            "R_",
            new ConditionExpression("cra58_ordernumber", ConditionOperator.Equal, orderId));
        return $"R_{last + 1:D3}";
    }

    // Número más alto entre los registros cuyo campo empieza por `prefix` (0 si no hay ninguno).
    // `extraCondition` limita la búsqueda, p. ej. a los detalles de una orden.
    private static int FindLastNumber(
        IOrganizationService service,
        string table,
        string column,
        string prefix,
        ConditionExpression? extraCondition = null)
    {
        var query = new QueryExpression(table)
        {
            ColumnSet = new ColumnSet(column),
            Criteria = new FilterExpression
            {
                Conditions = { new ConditionExpression(column, ConditionOperator.BeginsWith, prefix) }
            }
        };

        if (extraCondition != null)
        {
            query.Criteria.AddCondition(extraCondition);
        }

        return service.RetrieveMultiple(query).Entities
            .Select(e => e.GetAttributeValue<string>(column))
            .Select(value => int.TryParse(value?[prefix.Length..], out var number) ? number : 0)
            .DefaultIfEmpty(0)
            .Max();
    }
}
