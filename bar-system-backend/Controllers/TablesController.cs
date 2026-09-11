using bar_system_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace bar_system_backend.Controllers;

[ApiController]
[Route("api/tables")]
public class MesasController : ControllerBase
{
    private readonly DataverseServices _dataverseServices;

    public MesasController(DataverseServices dataverseServices)
    {
        _dataverseServices = dataverseServices;
    }

    [HttpGet]
    public IActionResult GetAllTables()
    {
        try
        {
            var query = new QueryExpression("cra58_table")
            {
                ColumnSet = new ColumnSet("cra58_capacity", "cra58_status", "cra58_tablenumber")
            };

            var mesas = _dataverseServices.Client.RetrieveMultiple(query);

            var result = mesas.Entities.Select(static mesa => new
            {
                Id = mesa.GetAttributeValue<string>("cra58_tablenumber"),
                Capacidad = mesa.GetAttributeValue<int>("cra58_capacity"),
                Estado = mesa.GetAttributeValue<OptionSetValue>("cra58_status")?.Value,
                EstadoNombre = mesa.FormattedValues.TryGetValue(
                    "cra58_status",
                    out var estadoNombre)
                ? estadoNombre
                : null
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving mesas: {ex.Message}");
        }
    }

    [HttpGet("{tableId}")]
    public IActionResult GetTableById(string tableId)
    {
        try
        {
            var query = new QueryExpression("cra58_table")
            {
                ColumnSet = new ColumnSet("cra58_capacity", "cra58_status", "cra58_tablenumber"),
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
                return NotFound($"Mesa with ID {tableId} not found.");
            }

            var result = new
            {
                Id = mesa.GetAttributeValue<string>("cra58_tablenumber"),
                Capacidad = mesa.GetAttributeValue<int>("cra58_capacity"),
                Estado = mesa.GetAttributeValue<OptionSetValue>("cra58_status")?.Value,
                EstadoNombre = mesa.FormattedValues.TryGetValue(
                    "cra58_status",
                    out var estadoNombre)
                ? estadoNombre
                : null
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving mesa: {ex.Message}");
        }
    }

    [HttpPut("{tableId}")]
    public IActionResult UpdateStatusTable(string tableId, [FromBody] int newStatus)
    {
        try
        {
            var query = new QueryExpression("cra58_table")
            {
                ColumnSet = new ColumnSet("cra58_capacity", "cra58_status", "cra58_tablenumber"),
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
                return NotFound($"Mesa with ID {tableId} not found.");
            }

            mesa["cra58_status"] = new OptionSetValue(newStatus);
            _dataverseServices.Client.Update(mesa);

            return Ok($"Mesa with ID {tableId} updated successfully.");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error updating mesa: {ex.Message}");
        }
    }

}

