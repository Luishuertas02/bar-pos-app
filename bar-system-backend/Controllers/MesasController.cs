using bar_system_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace bar_system_backend.Controllers;

[ApiController]
[Route("api/mesas")]
public class MesasController : ControllerBase
{
    private readonly DataverseServices _dataverseServices;

    public MesasController(DataverseServices dataverseServices)
    {
        _dataverseServices = dataverseServices;
    }

    [HttpGet]
    public IActionResult GetAllMesas()
    {
        try
        {
            var query = new QueryExpression("cra58_mesa")
            {
                ColumnSet = new ColumnSet("cra58_capacidad", "cra58_estado", "cra58_numeromesa")
            };

            var mesas = _dataverseServices.Client.RetrieveMultiple(query);

            var result = mesas.Entities.Select(static mesa => new
            {
                Id = mesa.GetAttributeValue<string>("cra58_NumeroMesa"),
                Capacidad = mesa.GetAttributeValue<int>("cra58_capacidad"),
                Estado = mesa.GetAttributeValue<OptionSetValue>("cra58_estado")?.Value
                
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving mesas: {ex.Message}");
        }
    }
}

