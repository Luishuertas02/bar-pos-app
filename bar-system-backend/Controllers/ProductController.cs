using bar_system_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace bar_system_backend.Controllers;

[ApiController]
[Route("api/products")]

public class ProductController : ControllerBase
{
    private readonly DataverseServices _dataverseServices;

    public ProductController(DataverseServices dataverseServices)
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
                ColumnSet = new ColumnSet("cra58_productname", "cra58_saleprice", "cra58_category")
            };

            var products = _dataverseServices.Client.RetrieveMultiple(query);

            var result = products.Entities.Select(static product => new
            {
                Nombre = product.GetAttributeValue<string>("cra58_productname"),
                Precio = product.GetAttributeValue<Money>("cra58_saleprice")?.Value,
                Categoria = product.GetAttributeValue<OptionSetValue>("cra58_category")?.Value,
                CategoriaNombre = product.FormattedValues.TryGetValue(
                        "cra58_category",
                        out var categoriaNombre)
                            ? categoriaNombre
                            : null
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving products: {ex.Message}");
        }
    }

    [HttpGet("{productName}")]
    public IActionResult GetProductByName(string productName)
    {
        try
        {
            var query = new QueryExpression("cra58_product")
            {
                ColumnSet = new ColumnSet("cra58_productname", "cra58_saleprice", "cra58_category"),
                Criteria = new FilterExpression
                {
                    Conditions =
                    {
                        new ConditionExpression("cra58_productname", ConditionOperator.Equal, productName)
                    }
                }
            };

            var products = _dataverseServices.Client.RetrieveMultiple(query);

            if (products.Entities.Count == 0)
            {
                return NotFound($"Product with name '{productName}' not found.");
            }

            var product = products.Entities[0];

            var result = new
            {
                Nombre = product.GetAttributeValue<string>("cra58_productname"),
                Precio = product.GetAttributeValue<Money>("cra58_saleprice")?.Value,
                Categoria = product.GetAttributeValue<OptionSetValue>("cra58_category")?.Value,
                CategoriaNombre = product.FormattedValues.TryGetValue(
                        "cra58_category",
                        out var categoriaNombre)
                            ? categoriaNombre
                            : null
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving product: {ex.Message}");
        }
    }
}