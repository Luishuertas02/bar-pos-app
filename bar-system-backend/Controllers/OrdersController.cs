using bar_system_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Query;

namespace bar_system_backend.Controllers;

public record CreateOrderRequest(string? NumeroOrden);
public record RequestItem(string Producto, int Cantidad);
public record CreateRequestBody(List<RequestItem> Productos);
public record UpdateOrderDetailRequest(int Cantidad);

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private static readonly ColumnSet DetailColumns =
        new("cra58_requestnumber", "cra58_ordernumber", "cra58_product", "cra58_quantity", "cra58_total", "createdon");

    private readonly DataverseServices _dataverseServices;

    public OrdersController(DataverseServices dataverseServices)
    {
        _dataverseServices = dataverseServices;
    }

    // ---------------------------------------------------------------
    // Órdenes
    // ---------------------------------------------------------------

    [HttpGet]
    public IActionResult GetAllOrders()
    {
        try
        {
            var query = new QueryExpression("cra58_order")
            {
                ColumnSet = OrderRules.OrderColumns,
                Orders = { new OrderExpression("createdon", OrderType.Descending) }
            };

            var orders = _dataverseServices.Client.RetrieveMultiple(query);

            return Ok(orders.Entities.Select(o => ToOrderDto(o)));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving orders: {ex.Message}");
        }
    }

    // Devuelve la orden con todos sus detalles
    [HttpGet("{orderNumber}")]
    public IActionResult GetOrder(string orderNumber)
    {
        try
        {
            var order = FindOrder(orderNumber);

            if (order == null)
            {
                return NotFound($"Order {orderNumber} not found.");
            }

            return Ok(ToOrderDto(order, FindDetails(order.Id)));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving order: {ex.Message}");
        }
    }

    // Orden abierta de una mesa (o de su grupo), con sus detalles
    [HttpGet("/api/tables/{tableId}/order")]
    public IActionResult GetOpenOrderOfTable(string tableId)
    {
        try
        {
            var leaderId = FindLeaderId(tableId);

            if (leaderId == null)
            {
                return NotFound($"Mesa with ID {tableId} not found.");
            }

            var order = OrderRules.FindOpenOrder(_dataverseServices.Client, leaderId);

            if (order == null)
            {
                return NotFound($"La mesa {leaderId} no tiene una orden abierta.");
            }

            return Ok(ToOrderDto(order, FindDetails(order.Id)));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving order: {ex.Message}");
        }
    }

    // Crea una orden vacía manualmente. Lo normal es que se cree sola al ocupar una mesa.
    [HttpPost]
    public IActionResult CreateOrder([FromBody] CreateOrderRequest? request)
    {
        try
        {
            var orderNumber = string.IsNullOrWhiteSpace(request?.NumeroOrden)
                ? $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}"
                : request.NumeroOrden.Trim();

            if (FindOrder(orderNumber) != null)
            {
                return Conflict($"Ya existe la orden {orderNumber}.");
            }

            var order = new Entity("cra58_order")
            {
                ["cra58_ordernumber"] = orderNumber,
                ["cra58_productsnumber"] = 0,
                ["cra58_total"] = new Money(0),
                ["cra58_status"] = new OptionSetValue(OrderRules.StatusAbierto)
            };

            _dataverseServices.Client.Create(order);

            return CreatedAtAction(nameof(GetOrder), new { orderNumber }, ToOrderDto(FindOrder(orderNumber)!, []));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error creating order: {ex.Message}");
        }
    }

    // Borra la orden; Dataverse borra sus detalles en cascada
    [HttpDelete("{orderNumber}")]
    public IActionResult DeleteOrder(string orderNumber)
    {
        try
        {
            var order = FindOrder(orderNumber);

            if (order == null)
            {
                return NotFound($"Order {orderNumber} not found.");
            }

            _dataverseServices.Client.Delete("cra58_order", order.Id);

            return Ok($"Orden {orderNumber} eliminada.");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error deleting order: {ex.Message}");
        }
    }

    // ---------------------------------------------------------------
    // Pedidos (requests) y sus detalles
    // ---------------------------------------------------------------

    [HttpGet("{orderNumber}/details")]
    public IActionResult GetOrderDetails(string orderNumber)
    {
        try
        {
            var order = FindOrder(orderNumber);

            if (order == null)
            {
                return NotFound($"Order {orderNumber} not found.");
            }

            return Ok(FindDetails(order.Id).Select(d => ToDetailDto(d, orderNumber)));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving order details: {ex.Message}");
        }
    }

    // Registra un pedido con varios productos: una fila por producto, todas con el mismo R_00x.
    // Body: { "productos": [ { "producto": "Águila", "cantidad": 2 }, ... ] }
    [HttpPost("{orderNumber}/requests")]
    public IActionResult CreateRequest(string orderNumber, [FromBody] CreateRequestBody body)
    {
        try
        {
            var order = FindOrder(orderNumber);

            if (order == null)
            {
                return NotFound($"Order {orderNumber} not found.");
            }

            return AddRequestToOrder(order, body);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error creating request: {ex.Message}");
        }
    }

    // Igual que el anterior, pero sobre la orden abierta de la mesa (o de su grupo)
    [HttpPost("/api/tables/{tableId}/order/requests")]
    public IActionResult CreateRequestForTable(string tableId, [FromBody] CreateRequestBody body)
    {
        try
        {
            var leaderId = FindLeaderId(tableId);

            if (leaderId == null)
            {
                return NotFound($"Mesa with ID {tableId} not found.");
            }

            var order = OrderRules.FindOpenOrder(_dataverseServices.Client, leaderId);

            if (order == null)
            {
                return BadRequest($"La mesa {leaderId} no tiene una orden abierta. Ocupa la mesa primero.");
            }

            return AddRequestToOrder(order, body);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error creating request: {ex.Message}");
        }
    }

    // Cambia la cantidad de una fila (identificada por su id) y recalcula su total
    [HttpPut("{orderNumber}/details/{detailId:guid}")]
    public IActionResult UpdateOrderDetail(string orderNumber, Guid detailId, [FromBody] UpdateOrderDetailRequest request)
    {
        if (request.Cantidad < 1)
        {
            return BadRequest("La cantidad debe ser al menos 1. Para quitar el producto usa DELETE.");
        }

        try
        {
            var order = FindOrder(orderNumber);

            if (order == null)
            {
                return NotFound($"Order {orderNumber} not found.");
            }

            var details = FindDetails(order.Id);
            var detail = details.FirstOrDefault(d => d.Id == detailId);

            if (detail == null)
            {
                return NotFound($"Detail {detailId} not found in order {orderNumber}.");
            }

            var productName = detail.GetAttributeValue<string>("cra58_product");
            var prices = FindProductPrices([productName]);

            if (!prices.TryGetValue(productName, out var price))
            {
                return BadRequest($"El producto '{productName}' ya no existe.");
            }

            var patch = new Entity("cra58_orderdetail", detail.Id)
            {
                ["cra58_quantity"] = request.Cantidad,
                ["cra58_total"] = new Money(price * request.Cantidad)
            };

            // Se reflejan los valores nuevos para recalcular la orden
            detail["cra58_quantity"] = patch["cra58_quantity"];
            detail["cra58_total"] = patch["cra58_total"];

            SaveWithOrderTotals(order, details, [new UpdateRequest { Target = patch }]);

            return Ok(ToDetailDto(detail, orderNumber));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error updating order detail: {ex.Message}");
        }
    }

    [HttpDelete("{orderNumber}/details/{detailId:guid}")]
    public IActionResult DeleteOrderDetail(string orderNumber, Guid detailId)
    {
        try
        {
            var order = FindOrder(orderNumber);

            if (order == null)
            {
                return NotFound($"Order {orderNumber} not found.");
            }

            var details = FindDetails(order.Id);
            var detail = details.FirstOrDefault(d => d.Id == detailId);

            if (detail == null)
            {
                return NotFound($"Detail {detailId} not found in order {orderNumber}.");
            }

            details.Remove(detail);

            SaveWithOrderTotals(order, details, [new DeleteRequest { Target = detail.ToEntityReference() }]);

            return Ok($"Producto eliminado de la orden {orderNumber}.");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error deleting order detail: {ex.Message}");
        }
    }

    // ---------------------------------------------------------------
    // Auxiliares
    // ---------------------------------------------------------------

    private IActionResult AddRequestToOrder(Entity order, CreateRequestBody body)
    {
        var orderNumber = order.GetAttributeValue<string>("cra58_ordernumber");

        if (order.GetAttributeValue<OptionSetValue>("cra58_status")?.Value == OrderRules.StatusCerrado)
        {
            return BadRequest($"La orden {orderNumber} está cerrada.");
        }

        if (body.Productos == null || body.Productos.Count == 0)
        {
            return BadRequest("El pedido no tiene productos.");
        }

        if (body.Productos.Any(p => string.IsNullOrWhiteSpace(p.Producto) || p.Cantidad < 1))
        {
            return BadRequest("Cada producto necesita nombre y una cantidad de al menos 1.");
        }

        // Si el mismo producto viene varias veces se suma en una sola fila
        var items = body.Productos
            .GroupBy(p => p.Producto.Trim())
            .Select(g => new RequestItem(g.Key, g.Sum(p => p.Cantidad)))
            .ToList();

        var prices = FindProductPrices(items.Select(i => i.Producto));
        var missing = items.Where(i => !prices.ContainsKey(i.Producto)).Select(i => i.Producto).ToList();

        if (missing.Count > 0)
        {
            return BadRequest($"No existen los productos: {string.Join(", ", missing)}.");
        }

        var requestNumber = OrderRules.NextRequestNumber(_dataverseServices.Client, order.Id);

        var newDetails = items.Select(item => new Entity("cra58_orderdetail")
        {
            ["cra58_requestnumber"] = requestNumber,
            ["cra58_ordernumber"] = order.ToEntityReference(),
            ["cra58_product"] = item.Producto,
            ["cra58_quantity"] = item.Cantidad,
            ["cra58_total"] = new Money(prices[item.Producto] * item.Cantidad)
        }).ToList();

        var details = FindDetails(order.Id);
        details.AddRange(newDetails);

        SaveWithOrderTotals(order, details, newDetails.Select(d => (OrganizationRequest)new CreateRequest { Target = d }));

        return CreatedAtAction(
            nameof(GetOrder),
            new { orderNumber },
            ToOrderDto(FindOrder(orderNumber)!, FindDetails(order.Id)));
    }

    private Entity? FindOrder(string orderNumber)
    {
        var query = new QueryExpression("cra58_order")
        {
            ColumnSet = OrderRules.OrderColumns,
            Criteria = new FilterExpression
            {
                Conditions =
                {
                    new ConditionExpression("cra58_ordernumber", ConditionOperator.Equal, orderNumber)
                }
            }
        };

        return _dataverseServices.Client.RetrieveMultiple(query).Entities.FirstOrDefault();
    }

    private List<Entity> FindDetails(Guid orderId)
    {
        var query = new QueryExpression("cra58_orderdetail")
        {
            ColumnSet = DetailColumns,
            Criteria = new FilterExpression
            {
                Conditions =
                {
                    new ConditionExpression("cra58_ordernumber", ConditionOperator.Equal, orderId)
                }
            },
            Orders = { new OrderExpression("createdon", OrderType.Ascending) }
        };

        return _dataverseServices.Client.RetrieveMultiple(query).Entities.ToList();
    }

    // Mesa principal del grupo de `tableId` (o la propia mesa), null si no existe
    private string? FindLeaderId(string tableId)
    {
        var query = new QueryExpression("cra58_table")
        {
            ColumnSet = new ColumnSet("cra58_tablenumber", "cra58_groupbyid"),
            Criteria = new FilterExpression
            {
                Conditions =
                {
                    new ConditionExpression("cra58_tablenumber", ConditionOperator.Equal, tableId)
                }
            }
        };

        var mesa = _dataverseServices.Client.RetrieveMultiple(query).Entities.FirstOrDefault();

        if (mesa == null)
        {
            return null;
        }

        var groupId = mesa.GetAttributeValue<string>("cra58_groupbyid");
        return string.IsNullOrEmpty(groupId) ? mesa.GetAttributeValue<string>("cra58_tablenumber") : groupId;
    }

    // Precio de venta de cada producto, por nombre
    private Dictionary<string, decimal> FindProductPrices(IEnumerable<string> productNames)
    {
        var names = productNames.Distinct().ToArray();

        var query = new QueryExpression("cra58_product")
        {
            ColumnSet = new ColumnSet("cra58_productname", "cra58_saleprice"),
            Criteria = new FilterExpression
            {
                Conditions =
                {
                    new ConditionExpression("cra58_productname", ConditionOperator.In, names)
                }
            }
        };

        return _dataverseServices.Client.RetrieveMultiple(query).Entities
            .GroupBy(p => p.GetAttributeValue<string>("cra58_productname"))
            .ToDictionary(g => g.Key, g => g.First().GetAttributeValue<Money>("cra58_saleprice")?.Value ?? 0);
    }

    // Guarda los cambios de detalles y los totales de la orden en una sola transacción.
    // `details` debe ser la lista de detalles de la orden ya con los cambios aplicados.
    private void SaveWithOrderTotals(Entity order, List<Entity> details, IEnumerable<OrganizationRequest> detailChanges)
    {
        var orderPatch = new Entity("cra58_order", order.Id)
        {
            ["cra58_productsnumber"] = details.Sum(d => d.GetAttributeValue<int?>("cra58_quantity") ?? 0),
            ["cra58_total"] = new Money(details.Sum(d => d.GetAttributeValue<Money>("cra58_total")?.Value ?? 0))
        };

        var transaction = new ExecuteTransactionRequest { Requests = new OrganizationRequestCollection() };
        transaction.Requests.AddRange(detailChanges);
        transaction.Requests.Add(new UpdateRequest { Target = orderPatch });

        _dataverseServices.Client.Execute(transaction);
    }

    private static object ToOrderDto(Entity order, IEnumerable<Entity>? details = null)
    {
        var orderNumber = order.GetAttributeValue<string>("cra58_ordernumber");

        return new
        {
            NumeroOrden = orderNumber,
            NumeroProductos = order.GetAttributeValue<int?>("cra58_productsnumber") ?? 0,
            Total = order.GetAttributeValue<Money>("cra58_total")?.Value ?? 0,
            Estado = order.GetAttributeValue<OptionSetValue>("cra58_status")?.Value,
            EstadoNombre = order.FormattedValues.TryGetValue("cra58_status", out var estadoNombre) ? estadoNombre : null,
            CreadaEn = order.GetAttributeValue<DateTime?>("createdon"),
            Detalles = details?.Select(d => ToDetailDto(d, orderNumber))
        };
    }

    private static object ToDetailDto(Entity detail, string orderNumber) => new
    {
        Id = detail.Id,
        NumeroRequest = detail.GetAttributeValue<string>("cra58_requestnumber"),
        NumeroOrden = orderNumber,
        Producto = detail.GetAttributeValue<string>("cra58_product"),
        Cantidad = detail.GetAttributeValue<int?>("cra58_quantity") ?? 0,
        Total = detail.GetAttributeValue<Money>("cra58_total")?.Value ?? 0,
        CreadoEn = detail.GetAttributeValue<DateTime?>("createdon")
    };
}
