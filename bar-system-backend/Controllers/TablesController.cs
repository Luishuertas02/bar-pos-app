using bar_system_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Query;

namespace bar_system_backend.Controllers;

[ApiController]
[Route("api/tables")]
public class MesasController : ControllerBase
{
    // Valores del option set cra58_status en Dataverse
    private const int StatusDisponible = 962000000;
    private const int StatusOcupada = 962000001;

    private static readonly ColumnSet TableColumns =
        new("cra58_capacity", "cra58_status", "cra58_tablenumber", "cra58_peoplenumber", "cra58_groupbyid");

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
                ColumnSet = TableColumns
            };

            var mesas = _dataverseServices.Client.RetrieveMultiple(query);

            return Ok(mesas.Entities.Select(ToDto));
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
            var mesa = FindTable(tableId);

            if (mesa == null)
            {
                return NotFound($"Mesa with ID {tableId} not found.");
            }

            return Ok(ToDto(mesa));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error retrieving mesa: {ex.Message}");
        }
    }

    // Cambia el estado de la mesa (o de todo su grupo si está asociada).
    // Liberar un grupo lo deshace: todas sus mesas quedan disponibles y sin gente.
    // Ocupar abre una orden para la mesa y liberar cierra la que tenga abierta.
    [HttpPut("{tableId}")]
    public IActionResult UpdateStatusTable(string tableId, [FromBody] int newStatus)
    {
        try
        {
            var mesa = FindTable(tableId);

            if (mesa == null)
            {
                return NotFound($"Mesa with ID {tableId} not found.");
            }

            var updates = new List<Entity>();

            foreach (var member in GetGroupOf(mesa))
            {
                var patch = Patch(member);
                patch["cra58_status"] = new OptionSetValue(newStatus);

                // Una mesa liberada ya no tiene gente ni grupo
                if (newStatus == StatusDisponible)
                {
                    patch["cra58_peoplenumber"] = 0;
                    patch["cra58_groupbyid"] = null;
                }

                updates.Add(patch);
            }

            SaveAll(updates, OrderChangesFor(GetLeaderId(mesa), newStatus));

            return Ok($"Mesa with ID {tableId} updated successfully.");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error updating mesa: {ex.Message}");
        }
    }

    // Guarda las personas en la mesa principal del grupo. La capacidad es la suma del grupo.
    [HttpPut("{tableId}/people")]
    public IActionResult UpdatePeopleTable(string tableId, [FromBody] int peopleNumber)
    {
        if (peopleNumber < 0)
        {
            return BadRequest("El número de personas no puede ser negativo.");
        }

        try
        {
            var mesa = FindTable(tableId);

            if (mesa == null)
            {
                return NotFound($"Mesa with ID {tableId} not found.");
            }

            var group = GetGroupOf(mesa);
            var leaderId = GetLeaderId(mesa);

            var capacidad = group.Sum(m => m.GetAttributeValue<int>("cra58_capacity"));
            if (capacidad > 0 && peopleNumber > capacidad)
            {
                return BadRequest($"La mesa {leaderId} tiene capacidad para {capacidad} personas.");
            }

            // Con al menos una persona la mesa pasa a ocupada; con cero queda disponible
            var newStatus = peopleNumber >= 1 ? StatusOcupada : StatusDisponible;
            var status = new OptionSetValue(newStatus);

            var updates = group.Select(member =>
            {
                var patch = Patch(member);
                patch["cra58_status"] = status;
                patch["cra58_peoplenumber"] = GetTableNumber(member) == leaderId ? peopleNumber : 0;
                return patch;
            });

            SaveAll(updates, OrderChangesFor(leaderId, newStatus));

            // Se vuelve a consultar para devolver el EstadoNombre actualizado
            return Ok(ToDto(FindTable(leaderId)!));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error updating mesa: {ex.Message}");
        }
    }

    // Asocia otras mesas a esta (que pasa a ser la principal del grupo).
    // Body: ["Me2", "Me3"]
    [HttpPut("{tableId}/group")]
    public IActionResult AssociateTables(string tableId, [FromBody] string[] tableIds)
    {
        try
        {
            var leader = FindTable(tableId);

            if (leader == null)
            {
                return NotFound($"Mesa with ID {tableId} not found.");
            }

            var leaderGroup = leader.GetAttributeValue<string>("cra58_groupbyid");
            if (!string.IsNullOrEmpty(leaderGroup) && leaderGroup != tableId)
            {
                return BadRequest($"La mesa {tableId} ya está asociada a {leaderGroup}. Asocia desde la mesa principal.");
            }

            var leaderStatus = leader.GetAttributeValue<OptionSetValue>("cra58_status");
            var updates = new List<Entity>();

            var leaderPatch = Patch(leader);
            leaderPatch["cra58_groupbyid"] = tableId;
            updates.Add(leaderPatch);

            foreach (var id in tableIds.Where(id => id != tableId).Distinct())
            {
                var member = FindTable(id);

                if (member == null)
                {
                    return NotFound($"Mesa with ID {id} not found.");
                }

                var memberGroup = member.GetAttributeValue<string>("cra58_groupbyid");
                if (!string.IsNullOrEmpty(memberGroup) && memberGroup != tableId)
                {
                    return BadRequest($"La mesa {id} ya está asociada a {memberGroup}.");
                }

                if (string.IsNullOrEmpty(memberGroup)
                    && member.GetAttributeValue<OptionSetValue>("cra58_status")?.Value == StatusOcupada)
                {
                    return BadRequest($"La mesa {id} está ocupada y no se puede asociar.");
                }

                var patch = Patch(member);
                patch["cra58_groupbyid"] = tableId;
                patch["cra58_peoplenumber"] = 0;
                if (leaderStatus != null)
                {
                    patch["cra58_status"] = leaderStatus;
                }
                updates.Add(patch);
            }

            SaveAll(updates);

            return Ok(FindGroup(tableId).Select(ToDto));
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error associating mesas: {ex.Message}");
        }
    }

    // Quita una mesa hija del grupo: queda libre y sin gente. La principal conserva su gente,
    // ajustada a la capacidad que queda si ya no caben todos.
    // Si en el grupo solo queda la principal, el grupo desaparece.
    [HttpDelete("{tableId}/group/{memberId}")]
    public IActionResult DissociateTable(string tableId, string memberId)
    {
        try
        {
            var mesa = FindTable(tableId);

            if (mesa == null)
            {
                return NotFound($"Mesa with ID {tableId} not found.");
            }

            var leaderId = GetLeaderId(mesa);
            if (memberId == leaderId)
            {
                return BadRequest($"La mesa {leaderId} es la principal del grupo; solo se pueden desasociar las mesas hijas.");
            }

            var group = GetGroupOf(mesa);
            var member = group.FirstOrDefault(m => GetTableNumber(m) == memberId);

            if (member == null)
            {
                return BadRequest($"La mesa {memberId} no está asociada a {leaderId}.");
            }

            var remaining = group.Where(m => m != member).ToList();
            var leader = remaining.First(m => GetTableNumber(m) == leaderId);

            var memberPatch = Patch(member);
            memberPatch["cra58_groupbyid"] = null;
            memberPatch["cra58_status"] = new OptionSetValue(StatusDisponible);
            memberPatch["cra58_peoplenumber"] = 0;

            var updates = new List<Entity> { memberPatch };
            var leaderPatch = Patch(leader);

            // Si sin esta mesa ya no caben todos, las personas se ajustan a la capacidad restante
            var personas = leader.GetAttributeValue<int?>("cra58_peoplenumber") ?? 0;
            var capacidad = remaining.Sum(m => m.GetAttributeValue<int>("cra58_capacity"));
            if (capacidad > 0 && personas > capacidad)
            {
                leaderPatch["cra58_peoplenumber"] = capacidad;
            }

            if (remaining.Count == 1)
            {
                leaderPatch["cra58_groupbyid"] = null;
            }

            if (leaderPatch.Attributes.Count > 0)
            {
                updates.Add(leaderPatch);
            }

            SaveAll(updates);

            return Ok($"Mesa {memberId} desasociada de {leaderId}.");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error dissociating mesa: {ex.Message}");
        }
    }

    private Entity? FindTable(string tableId)
    {
        var query = new QueryExpression("cra58_table")
        {
            ColumnSet = TableColumns,
            Criteria = new FilterExpression
            {
                Conditions =
                {
                    new ConditionExpression("cra58_tablenumber", ConditionOperator.Equal, tableId)
                }
            }
        };

        return _dataverseServices.Client.RetrieveMultiple(query).Entities.FirstOrDefault();
    }

    private List<Entity> FindGroup(string leaderId)
    {
        var query = new QueryExpression("cra58_table")
        {
            ColumnSet = TableColumns,
            Criteria = new FilterExpression
            {
                Conditions =
                {
                    new ConditionExpression("cra58_groupbyid", ConditionOperator.Equal, leaderId)
                }
            }
        };

        return _dataverseServices.Client.RetrieveMultiple(query).Entities.ToList();
    }

    // Todas las mesas del grupo de `mesa`, o solo ella si no está asociada
    private List<Entity> GetGroupOf(Entity mesa)
    {
        if (string.IsNullOrEmpty(mesa.GetAttributeValue<string>("cra58_groupbyid")))
        {
            return [mesa];
        }

        var group = FindGroup(GetLeaderId(mesa));
        return group.Count > 0 ? group : [mesa];
    }

    private static string GetTableNumber(Entity mesa) => mesa.GetAttributeValue<string>("cra58_tablenumber");

    private static string GetLeaderId(Entity mesa)
    {
        var groupId = mesa.GetAttributeValue<string>("cra58_groupbyid");
        return string.IsNullOrEmpty(groupId) ? GetTableNumber(mesa) : groupId;
    }

    // Entidad vacía con el mismo Id, para enviar a Dataverse solo los campos que cambian
    private static Entity Patch(Entity mesa) => new(mesa.LogicalName, mesa.Id);

    // Orden de la mesa según su nuevo estado: al ocuparla se crea una orden abierta
    // (si no tiene ya una) y al liberarla se cierra la que esté abierta y se borran sus pedidos.
    private List<OrganizationRequest> OrderChangesFor(string leaderId, int newStatus)
    {
        var client = _dataverseServices.Client;
        var openOrder = OrderRules.FindOpenOrder(client, leaderId);

        if (newStatus == StatusOcupada && openOrder == null)
        {
            return [new CreateRequest { Target = OrderRules.NewOrderForTable(client, leaderId) }];
        }

        if (newStatus == StatusDisponible && openOrder != null)
        {
            return OrderRules.CloseOrderRequests(client, openOrder);
        }

        return [];
    }

    // Guarda todos los cambios en una sola transacción (o todos o ninguno)
    private void SaveAll(IEnumerable<Entity> updates, IEnumerable<OrganizationRequest>? extraRequests = null)
    {
        var request = new ExecuteTransactionRequest { Requests = new OrganizationRequestCollection() };

        foreach (var entity in updates)
        {
            request.Requests.Add(new UpdateRequest { Target = entity });
        }

        foreach (var extra in extraRequests ?? [])
        {
            request.Requests.Add(extra);
        }

        if (request.Requests.Count > 0)
        {
            _dataverseServices.Client.Execute(request);
        }
    }

    private static object ToDto(Entity mesa) => new
    {
        Id = mesa.GetAttributeValue<string>("cra58_tablenumber"),
        Capacidad = mesa.GetAttributeValue<int>("cra58_capacity"),
        Personas = mesa.GetAttributeValue<int?>("cra58_peoplenumber") ?? 0,
        Grupo = string.IsNullOrEmpty(mesa.GetAttributeValue<string>("cra58_groupbyid"))
            ? null
            : mesa.GetAttributeValue<string>("cra58_groupbyid"),
        Estado = mesa.GetAttributeValue<OptionSetValue>("cra58_status")?.Value,
        EstadoNombre = mesa.FormattedValues.TryGetValue(
            "cra58_status",
            out var estadoNombre)
        ? estadoNombre
        : null
    };
}
