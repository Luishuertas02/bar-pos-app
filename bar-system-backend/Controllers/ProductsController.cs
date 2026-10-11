using bar_system_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace bar_system_backend.Controllers;

[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private static readonly ColumnSet ProductColumns =
        new("cra58_productname", "cra58_saleprice", "cra58_category");

    private readonly DataverseServices _dataverseServices;

    public ProductsController(DataverseServices dataverseServices)
    {
        _dataverseServices = dataverseServices;
    }

    [HttpGet]
    public IActionResult GetAllProducts()
    {
        try
        {
            var query = new QueryExpression("cra58_product")
            {
                ColumnSet = ProductColumns,
                Orders =
                {
                    new OrderExpression("cra58_category", OrderType.Ascending),
                    new OrderExpression("cra58_productname", OrderType.Ascending)
                }
            };

            var products = _dataverseServices.Client.RetrieveMultiple(query);

            return Ok(products.Entities.Select(ToDto));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving products: {ex.Message}");
        }
    }

    private static object ToDto(Entity product) => new
    {
        Id = product.Id,
        Nombre = product.GetAttributeValue<string>("cra58_productname"),
        Precio = product.GetAttributeValue<Money>("cra58_saleprice")?.Value ?? 0,
        Categoria = product.GetAttributeValue<OptionSetValue>("cra58_category")?.Value,
        CategoriaNombre = product.FormattedValues.TryGetValue(
            "cra58_category",
            out var categoriaNombre)
        ? categoriaNombre
        : null
    };
}
